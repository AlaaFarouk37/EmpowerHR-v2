from django.urls import path
from .views import (
    HRPeopleIntelligenceView,
    RunAttritionPredictionView,
    AttritionPredictionListView,
    AttritionPredictionLatestView,
    AttritionGovernanceSummaryView,
    NotifyTeamLeaderOfRiskView,
)

urlpatterns = [
    # POST /api/attrition/run/                  HR Manager triggers bulk prediction
    path('run/', RunAttritionPredictionView.as_view(), name='attrition-run'),

    # GET  /api/attrition/predictions/          all predictions (filterable)
    path('predictions/', AttritionPredictionListView.as_view(), name='attrition-list'),

    # GET  /api/attrition/predictions/latest/   latest prediction per employee
    path('predictions/latest/', AttritionPredictionLatestView.as_view(), name='attrition-latest'),

    # POST /api/attrition/predictions/<id>/notify-tl/   HR notifies the at-risk employee's team leader
    path('predictions/<str:predictionID>/notify-tl/', NotifyTeamLeaderOfRiskView.as_view(), name='attrition-notify-tl'),

    # GET  /api/attrition/governance/           governance snapshot for model confidence and review load
    path('governance/', AttritionGovernanceSummaryView.as_view(), name='attrition-governance'),
        # GET /api/feedback/hr/intelligence/            executive people-intelligence board
    path('hr/intelligence/', HRPeopleIntelligenceView.as_view(), name='hr-people-intelligence'),

]
