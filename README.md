# api-moderation

Only supports images as of right now.

## Routes

- POST `/image`
  - returns `{ success: true }` if image passes
  - returns `{ success: false, error: "" }` if image fails or anything else fails
