# Authentication Session Management Improvements – Phase 2: Session Warning System

## Overview
Enhance the session warning system with advanced UI components, countdown timers, and seamless integration with the notification system. This phase focuses on creating an intuitive user experience for session management with clear visual feedback and user control options.

## Objectives
- [ ] Create advanced SessionWarningModal with countdown timer
- [ ] Implement extend session functionality with API integration
- [ ] Add session warning notifications with different severity levels
- [ ] Integrate with existing NotificationSystem for consistent UX
- [ ] Add comprehensive testing for warning system components

## Deliverables
- File: `frontend/src/presentation/components/auth/SessionWarningModal.jsx` - Enhanced warning modal
- File: `frontend/src/infrastructure/hooks/useSessionWarning.js` - Custom hook for session warnings
- File: `frontend/src/infrastructure/utils/SessionTimer.js` - Countdown timer utility
- API: `POST /api/session/extend` - Enhanced session extension with validation
- API: `GET /api/session/time-remaining` - Get remaining session time
- Test: `frontend/tests/unit/SessionWarningModal.test.jsx` - Unit tests for warning modal
- Test: `frontend/tests/integration/SessionWarningFlow.test.jsx` - Integration tests for warning flow

## Dependencies
- Requires: Phase 1 completion (SessionMonitorService, Session API endpoints)
- Blocks: Phase 3 (Activity-Based Session Extension) start

## Estimated Time
6 hours

## Success Criteria
- [ ] SessionWarningModal displays accurate countdown timer
- [ ] Users can extend session with single click
- [ ] Warning notifications appear at appropriate times
- [ ] Modal auto-dismisses after session extension
- [ ] All warning system tests pass
- [ ] Integration with NotificationSystem works seamlessly
- [ ] Responsive design works on all screen sizes

## Technical Implementation Details

### SessionWarningModal Features
- Real-time countdown timer with visual progress bar
- Extend session button with loading state
- Logout now button with confirmation
- Auto-dismiss after successful extension
- Keyboard shortcuts (Enter to extend, Escape to dismiss)
- Accessibility features (ARIA labels, focus management)

### Session Timer Utility
- Precise countdown calculation
- Formatting for different time ranges
- Pause/resume functionality
- Event emission for timer events
- Memory cleanup on component unmount

### Enhanced Session API
- Session extension with activity validation
- Time remaining calculation
- Extension history tracking
- Rate limiting and abuse prevention
- Detailed error responses

### Notification Integration
- Warning notifications with different severity levels
- Persistent notifications for critical warnings
- Auto-dismissal based on user action
- Custom notification styling for session warnings

### User Experience Enhancements
- Smooth animations and transitions
- Clear visual hierarchy
- Consistent styling with application theme
- Mobile-optimized touch interactions
- Offline handling for session warnings
