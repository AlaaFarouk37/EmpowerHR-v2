"""Re-trace the CV ranking pipeline for one submission. Read-only — recomputes, does not save.

Usage:
    python retrace_cv.py                # newest scored submission
    python retrace_cv.py 42             # submission with pk=42
    python retrace_cv.py "Sara"         # newest submission whose candidate name/file matches
"""
import os, django, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from resume_pipeline.models import Submission
from resume_pipeline import pipeline as P

SEP = "=" * 72
arg = sys.argv[1] if len(sys.argv) > 1 else None


def pick_submission():
    qs = Submission.objects.select_related('job').order_by('-id')
    if arg is None:
        return qs.filter(status=Submission.Status.DONE).first() or qs.first()
    if arg.isdigit():
        return qs.filter(pk=int(arg)).first()
    return qs.filter(candidate_name__icontains=arg).first()


sub = pick_submission()
if sub is None:
    if arg and not arg.isdigit():
        print(f'No submission found for candidate name matching "{arg}".')
    else:
        print("No submission found.")
    sys.exit(1)

job = sub.job
print(f"\n{SEP}\n  SUBMISSION #{sub.pk}  ->  JOB: {job}\n{SEP}")
print(f"    candidate     : {sub.candidate_name}")
print(f"    status        : {sub.status}")
print(f"    resume file   : {sub.resume_file.name}")

# ── re-extract text (read-only) ───────────────────────────────────────────────
with sub.resume_file.open("rb") as f:
    raw_text = P.extract_text_from_resume(f, sub.resume_file.name)
print(f"    resume chars  : {len(raw_text)}")

# ── EXTRACTIONS ───────────────────────────────────────────────────────────────
candidate_skills = P.extract_skills(raw_text)
edu_text = P.extract_education_sentences(raw_text)
degree = P.extract_degree_level(edu_text)
years, method = P.extract_experience_years(raw_text)

print(f"\n  EXTRACTED FROM RESUME")
print(f"    skills found  : {len(candidate_skills)}  {sorted(candidate_skills)[:12]}{' ...' if len(candidate_skills) > 12 else ''}")
print(f"    degree level  : {degree}")
print(f"    experience    : {years} yrs   (method: {method})")

# ── JOB REQUIREMENTS ──────────────────────────────────────────────────────────
print(f"\n  JOB REQUIREMENTS")
print(f"    required skills   : {list(job.required_skills)}")
print(f"    min experience    : {job.min_experience_years} yrs")
print(f"    required degree   : {job.required_degree}")
print(f"    weights (sk/ex/ed/sem): "
      f"{job.weight_skills} / {job.weight_experience} / {job.weight_education} / {job.weight_semantic}")

# ── SEMANTIC (flag fallback) ──────────────────────────────────────────────────
used_fallback = False
try:
    P._get_model()  # force-load to detect fallback before scoring
    model_ok = True
except Exception as exc:
    model_ok = False
    print(f"\n  [!] transformer failed to load: {exc}")
sem = P.compute_semantic_score(raw_text, job.description)
if not model_ok:
    used_fallback = True

# ── DIMENSION SCORES ──────────────────────────────────────────────────────────
s_skills = P.skills_score(job.required_skills, candidate_skills)
s_exp    = P.experience_score(job.min_experience_years, years)
s_edu    = P.education_score(job.required_degree, degree)

print(f"\n{SEP}\n  DIMENSION SCORES (0-100)\n{SEP}")
print(f"    skills      : {s_skills:>7.2f}   (matched {len(set(map(str.lower, map(str, job.required_skills))) & set(map(str.lower, candidate_skills)))} of {len(job.required_skills)} required)")
print(f"    experience  : {s_exp:>7.2f}   ({years} / {job.min_experience_years} required)")
print(f"    education   : {s_edu:>7.2f}   ({degree} vs {job.required_degree} required)")
print(f"    semantic    : {sem:>7.2f}   {'<- LEXICAL FALLBACK (transformer unavailable!)' if used_fallback else '(transformer cosine x100)'}")

# ── WEIGHTED FINAL ────────────────────────────────────────────────────────────
final = P.weighted_ats_score(s_skills, s_exp, s_edu, sem, job)
print(f"\n{SEP}\n  WEIGHTED ATS SCORE\n{SEP}")
print(f"    {job.weight_skills}*{s_skills} + {job.weight_experience}*{s_exp} + "
      f"{job.weight_education}*{s_edu} + {job.weight_semantic}*{sem}")
print(f"    = {final}")
stored = getattr(sub, 'ats_score', None)
print(f"\n    recomputed : {final}")
print(f"    stored     : {stored}   {'MATCH' if stored == final else 'DIFFERS (re-score may be needed)'}")
if used_fallback:
    print(f"\n  [!] WARNING: semantic ran on lexical fallback. Pre-warm the model before demoing.")
