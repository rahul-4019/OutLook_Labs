# Contributing

This is an assignment project for ReachInbox. If you're reviewing this code, here are some areas that could be improved:

## Potential Improvements

1. **Email Validation**: Add proper email validation before scheduling
2. **CSV Parser**: Use a proper CSV parsing library (e.g., PapaParse)
3. **Pagination**: Add pagination for email lists
4. **WebSockets**: Replace polling with WebSockets for real-time updates
5. **Email Templates**: Support for HTML email templates
6. **Email Cancellation**: Allow users to cancel scheduled emails
7. **Analytics**: Add email open/click tracking
8. **Multi-tenant**: Support for multiple users/organizations
9. **Email Attachments**: Support for file attachments
10. **Bulk Operations**: Support for bulk actions on emails

## Code Structure

- `backend/` - Express.js API server
- `frontend/` - Next.js React application
- `docker-compose.yml` - Docker services configuration

## Testing

To test the system:

1. Start all services
2. Schedule some emails for future times
3. Stop the backend server
4. Start the backend server again
5. Verify emails are still scheduled and will send at the correct time
