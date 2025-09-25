from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/compute/', views.api_compute, name='api_compute'),
]
