import logging
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ProfileUpdateSerializer,
    MentorApplicationSerializer
)
from .models import MentorApplication
from .permissions import IsAdmin

logger = logging.getLogger('accounts.views')

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Received registration request.")
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                logger.info(f"User '{user.username}' successfully registered.")
                user_serializer = UserSerializer(user)
                return Response(user_serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.error(f"Error saving user during registration: {str(e)}", exc_info=True)
                return Response({"detail": "Error registering user. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.warning(f"Registration failed with validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.info(f"Logout initiated by user '{request.user.username}'.")
        refresh_token = request.data.get("refresh")
        
        if not refresh_token:
            logger.warning(f"Logout failed for user '{request.user.username}': 'refresh' token parameter is missing.")
            return Response({"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            logger.info(f"Refresh token successfully blacklisted. User '{request.user.username}' logged out.")
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            logger.error(f"Error blacklisting token for user '{request.user.username}': {str(e)}", exc_info=True)
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)

class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.info(f"Retrieving profile for user '{request.user.username}'.")
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        logger.info(f"Profile update request received for user '{request.user.username}'.")
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            try:
                user = serializer.save()
                logger.info(f"Profile for user '{user.username}' updated successfully.")
                user_serializer = UserSerializer(user)
                return Response(user_serializer.data, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Error updating profile for user '{request.user.username}': {str(e)}", exc_info=True)
                return Response({"detail": "Internal error updating profile."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.warning(f"Profile update validation failed for user '{request.user.username}': {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorApplyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.info(f"Mentor application submission received from student '{request.user.username}'.")
        serializer = MentorApplicationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            try:
                application = serializer.save(user=request.user)
                logger.info(f"Mentor application ID {application.id} submitted for user '{request.user.username}'.")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.error(f"Error saving mentor application for user '{request.user.username}': {str(e)}", exc_info=True)
                return Response({"detail": "Internal error submitting application."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.warning(f"Mentor application failed validation for user '{request.user.username}': {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminMentorApplicationListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = MentorApplicationSerializer
    queryset = MentorApplication.objects.all().order_by('-applied_at')

    def get(self, request, *args, **kwargs):
        logger.info(f"Admin '{request.user.username}' is fetching mentor applications list.")
        return super().get(request, *args, **kwargs)

class AdminMentorApplicationDecideView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        logger.info(f"Admin '{request.user.username}' is deciding on mentor application ID {pk}.")
        try:
            application = MentorApplication.objects.get(pk=pk)
        except MentorApplication.DoesNotExist:
            logger.warning(f"Mentor application ID {pk} not found.")
            return Response({"detail": "Application not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in [MentorApplication.ApplicationStatus.APPROVED, MentorApplication.ApplicationStatus.REJECTED]:
            logger.warning(f"Admin '{request.user.username}' provided invalid status choice '{new_status}'.")
            return Response({"detail": "Invalid status choice. Must be 'approved' or 'rejected'."}, status=status.HTTP_400_BAD_REQUEST)

        if application.status != MentorApplication.ApplicationStatus.PENDING:
            logger.warning(f"Mentor application ID {pk} is already decided (status: '{application.status}').")
            return Response({"detail": f"Application is already {application.status}."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            application.status = new_status
            application.reviewed_at = timezone.now()
            application.save()
            logger.info(f"Mentor application ID {pk} for user '{application.user.username}' was updated to '{new_status}' by admin '{request.user.username}'.")
            return Response(MentorApplicationSerializer(application).data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error deciding mentor application ID {pk}: {str(e)}", exc_info=True)
            return Response({"detail": "Internal error updating application status."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

