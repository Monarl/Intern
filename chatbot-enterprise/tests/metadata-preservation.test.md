# Metadata Preservation Test Case

## Issue Description
When a user requests human handoff, the chat session metadata was being completely replaced instead of merged, causing loss of initial session data like `widget_position`, `user_agent`, and `created_at`.

## Expected Behavior
Handoff metadata should be merged with existing session metadata, preserving all original fields.

## Test Scenario

### Initial Session Creation
```json
// When chat widget creates a session
{
  "session_id": "test-session-123",
  "metadata": {
    "widget_position": "bottom-right",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "created_at": "2025-07-31T02:34:00.088Z"
  }
}
```

### After Handoff Request (BEFORE FIX)
```json
// WRONG: Original metadata was completely replaced
{
  "session_id": "test-session-123", 
  "metadata": {
    "handoff_requested": "true",
    "handoff_requested_at": "2025-07-31T03:00:00.000Z",
    "handoff_reason": "Need technical help"
    // ❌ Lost: widget_position, user_agent, created_at
  }
}
```

### After Handoff Request (AFTER FIX)
```json
// CORRECT: Handoff fields merged with existing metadata
{
  "session_id": "test-session-123",
  "metadata": {
    "widget_position": "bottom-right",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", 
    "created_at": "2025-07-31T02:34:00.088Z",
    "handoff_requested": "true",
    "handoff_requested_at": "2025-07-31T03:00:00.000Z",
    "handoff_reason": "Need technical help"
    // ✅ Preserved: All original metadata + new handoff fields
  }
}
```

### After Agent Handback
```json
// Agent handback preserves all metadata and clears handoff flags
{
  "session_id": "test-session-123",
  "metadata": {
    "widget_position": "bottom-right",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "created_at": "2025-07-31T02:34:00.088Z", 
    "handoff_requested": null,
    "handoff_requested_at": null,
    "handoff_reason": null,
    "had_human_intervention": true,
    "last_agent_id": "agent-uuid-123"
    // ✅ All metadata preserved throughout the cycle
  }
}
```

## Implementation Fix

### Chat Widget (ChatWidget.tsx)
**Before**:
```typescript
// WRONG: Completely replaces metadata
.update({
  metadata: {
    handoff_requested: 'true',
    handoff_requested_at: new Date().toISOString(),
    handoff_reason: reason || 'User requested human support'
  }
})
```

**After**:
```typescript
// CORRECT: Fetches current metadata and merges
const { data: currentSession } = await supabaseRef.current
  .from('chat_sessions')
  .select('metadata')
  .eq('session_id', sessionId)
  .single()

const updatedMetadata = {
  ...currentSession.metadata, // Preserve existing
  handoff_requested: 'true',
  handoff_requested_at: new Date().toISOString(), 
  handoff_reason: reason || 'User requested human support'
}

.update({ metadata: updatedMetadata })
```

### Admin Dashboard (Already Correct)
The admin dashboard was already correctly implemented:
```typescript
// CORRECT: Uses spread operator to preserve metadata
const updatedMetadata = { ...session?.metadata }
updatedMetadata.had_human_intervention = true
updatedMetadata.last_agent_id = user?.id
updatedMetadata.handoff_requested = null
// etc.
```

## Test Verification

To verify the fix works:

1. **Create a chat session** - verify initial metadata is set
2. **Request handoff** - verify original metadata is preserved 
3. **Agent intervention** - verify metadata continues to be preserved
4. **Agent handback** - verify handoff flags are cleared but other metadata remains
5. **Subsequent handoff** - verify the cycle can repeat without data loss

## Impact

- ✅ Session tracking data preserved (analytics, debugging)
- ✅ Widget configuration maintained (position, styling)  
- ✅ User context retained (user agent, creation time)
- ✅ Complete audit trail of session lifecycle
- ✅ No breaking changes to existing functionality

This fix ensures robust session management and prevents data loss during human handoff operations.
