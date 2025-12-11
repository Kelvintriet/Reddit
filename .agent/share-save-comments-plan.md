# Share, Save, and Comment Features Implementation Plan

## Features to Implement

### 1. Share Post Button
- [x] Button already exists in PostCard.tsx (line 452-455)
- [ ] Add share handler function
- [ ] Generate shareable URL with referral ID
- [ ] Copy URL to clipboard
- [ ] Show success toast/notification

### 2. Save Post Button  
- [x] Button already exists in PostCard.tsx (line 456-459)
- [x] savePost/unsavePost functions exist in users.ts
- [ ] Add save handler function in PostCard
- [ ] Track saved state in component
- [ ] Update button appearance when saved
- [ ] Show saved posts in Profile page

### 3. Deleted Comments Behavior
- [ ] Find Comment component
- [ ] Move deleted comments to bottom (only in "top" filter)
- [ ] Collapse deleted comments by default
- [ ] Add "Show deleted comment" button
- [ ] Prevent replies to deleted comments
- [ ] Hide reply button on deleted comments

## Files to Modify

1. `src/components/post/PostCard.tsx` - Add share and save handlers
2. `src/pages/Profile.tsx` - Display saved posts
3. `src/pages/PostDetail.tsx` or Comment component - Handle deleted comments
4. `src/collections/users.ts` - Already has save/unsave functions

## Implementation Order

1. Share button functionality (simplest)
2. Save button functionality (medium)
3. Deleted comments behavior (most complex)
