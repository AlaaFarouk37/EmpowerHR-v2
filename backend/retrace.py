"""Re-trace attrition pipeline + before/after the review-derived Performance Rating. Read-only."""
import os, django, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

import numpy as np
from django.db.models import Avg
from employee_management.models import Employee
from feedback.models import FeedbackSubmission
from attrition.predictor import (
    build_feature_vector, FEATURE_NAMES, QUESTION_MAP, get_answer_value,
    load_model, predict_risk, performance_rating_from_reviews, _derive_risk_level,
)

NAME = sys.argv[1] if len(sys.argv) > 1 else "Salma Hassan"
PR = FEATURE_NAMES.index('Performance Rating')
LABEL = {1: 'Low', 2: 'Below Average', 3: 'Average', 4: 'High'}
SEP = "=" * 72

emp = Employee.objects.select_related('job', 'team', 'department').filter(
    fullName__icontains=NAME, isDeleted=False).first()
print(f"\n{SEP}\n  {emp.fullName} ({emp.employeeID}) — {emp.jobTitle}\n{SEP}")

sub = (FeedbackSubmission.objects.filter(employeeID=emp, status=FeedbackSubmission.STATUS_COMPLETED)
       .prefetch_related('answers__questionID').order_by('-submittedAt').first())
answers_qs = list(sub.answers.select_related('questionID').all()) if sub else []

# --- Performance Rating source detail ---
revs = emp.performance_reviews.exclude(status='Draft')
avg = revs.aggregate(a=Avg('overallRating'))['a']
print(f"\n  PERFORMANCE RATING SOURCE")
print(f"    submitted reviews : {revs.count()}  ", end='')
print('[' + ', '.join(f'{r.reviewPeriod}:{r.overallRating}/5' for r in revs) + ']')
print(f"    average (1-5)     : {round(avg,2) if avg else None}")
print(f"    -> model PR (1-4) : {performance_rating_from_reviews(emp)} ({LABEL.get(performance_rating_from_reviews(emp),'-')})")
print(f"    old stored field  : {emp.performanceRating} (was fed directly before)")

# --- full feature vector ---
vector, missing = build_feature_vector(emp, answers_qs)
print(f"\n  FINAL FEATURE VECTOR")
for i, (name, val) in enumerate(zip(FEATURE_NAMES, vector)):
    mark = '  <- from reviews' if name == 'Performance Rating' else ('  MISSING->fallback' if name in missing else '')
    print(f"    {i:<3}{name:<27}{val:>9.2f}{mark}")

# --- before/after risk score ---
res = predict_risk(emp, answers_qs)
model = load_model()
old_vec = vector.copy()
old_vec[PR] = float(emp.performanceRating) if emp.performanceRating is not None else 0.0
old_proba = model.predict_proba(old_vec.reshape(1, -1))[0][1]

print(f"\n{SEP}\n  RISK SCORE: BEFORE vs AFTER\n{SEP}")
print(f"    BEFORE (PR={old_vec[PR]:.0f}, old field) : {round(float(old_proba),4)}  ({old_proba*100:.1f}%)  {_derive_risk_level(old_proba)}")
print(f"    AFTER  (PR={vector[PR]:.0f}, from reviews): {res['riskScore']}  ({res['riskScore']*100:.1f}%)  {res['riskLevel']}")
print(f"    delta                                   : {(res['riskScore']-float(old_proba))*100:+.2f} pp")
print(f"\n    confidence : {res.get('confidenceScore')} ({res.get('confidenceLabel')})   source: {res['predictionSource']}")
print(f"    missing    : {missing if missing else 'none'}")
print(f"\n  Summary: {res.get('explanationSummary')}")
