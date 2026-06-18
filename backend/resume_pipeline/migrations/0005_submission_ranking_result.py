# Generated for cached CV ranking results.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('resume_pipeline', '0004_job_pipeline_stages_alter_submission_review_stage'),
    ]

    operations = [
        migrations.AddField(
            model_name='submission',
            name='ranking_result',
            field=models.JSONField(blank=True, default=dict, null=True),
        ),
    ]
