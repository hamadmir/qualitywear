-- Purane (khaali) therapist app ke tables aur trigger hatana
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists
  public.messages, public.conversations, public.reviews, public.favorites,
  public.payments, public.notifications, public.verification_documents,
  public.availability, public.appointments, public.therapist_profiles,
  public.client_profiles, public.users
cascade;
drop type if exists public."UserRole", public."VerificationStatus", public."AppointmentStatus",
  public."PaymentStatus", public."SessionType" cascade;
