# HeronHub Admin Dashboard References

**Page type:** Desktop-first administration dashboard for publishing time-sensitive, tenant-scoped university information.

## References

### Stripe Dashboard

- URL: https://docs.stripe.com/dashboard
- Relevant pattern: A persistent primary navigation organizes operational domains, while the home surface elevates urgent notifications and configurable overview widgets.
- Apply to HeronHub: Keep navigation stable and lead with direct actions. Do not make analytics the first thing an admin must parse.

### GitHub Projects

- URL: https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects
- Relevant pattern: Multiple focused views serve distinct planning jobs, and fields make ownership, status, and dates directly visible.
- Apply to HeronHub: Source health and announcements need clear operational states rather than decorative metrics.

### Material Design 3 Navigation Drawer

- URL: https://m3.material.io/components/navigation-drawer/overview
- Relevant pattern: Navigation stays separate from task content and exposes only the destinations required to orient users in a complex product.
- Apply to HeronHub: The admin shell uses a concise drawer for Dashboard, Announcements, Sources, and Insights. The desktop workspace prioritizes the active task.

## Launch Checklist

### Legal and data

- Privacy notice describes the minimized query log: question, tenant, score, and timestamp.
- Terms, contact path, accessibility statement, and data-request path are linked from the product footer.
- Cookie consent is shown only if non-essential cookies are added.
- Each form explains the collected data and its purpose.
- Source access and announcements enforce tenant and role restrictions on the server.
- Confirm the applicable UMak privacy policy and local data-privacy requirements before launch.

### Accessibility

- Keyboard operation and visible focus states for navigation, forms, upload control, and lifecycle actions.
- Labels above every field, error messages below the field, and status changes announced through live regions.
- Text and controls meet WCAG AA contrast at desktop and phone sizes.

### Performance

- Server-render the initial dashboard shell and fetch only the selected tenant data.
- Reserve layout space for source-health and action-queue states to prevent layout shift.
- Avoid large visual assets on the operational dashboard.

### Sharing and search

- Add a descriptive page title and noindex authenticated admin routes.
- Provide appropriate Open Graph metadata only for public routes.

### Form reliability

- Validate title, body, tenant, start date, and end date before publish.
- Keep the existing source version retrievable until a replacement indexes successfully.
- Persist upload lifecycle states and give failures a retry path without data loss.
