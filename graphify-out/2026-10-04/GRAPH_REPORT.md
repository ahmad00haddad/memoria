# Graph Report - .  (2026-07-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1001 nodes · 1762 edges · 73 communities (60 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `922fd187`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_routeTree.gen.ts|routeTree.gen.ts]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_confirm-dialog.tsx|confirm-dialog.tsx]]
- [[_COMMUNITY_sidebar.tsx|sidebar.tsx]]
- [[_COMMUNITY_carousel.tsx|carousel.tsx]]
- [[_COMMUNITY_auth-middleware.ts|auth-middleware.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_utils.ts|utils.ts]]
- [[_COMMUNITY_Footer.tsx|Footer.tsx]]
- [[_COMMUNITY_cn|cn]]
- [[_COMMUNITY___root.tsx|__root.tsx]]
- [[_COMMUNITY_index.tsx|index.tsx]]
- [[_COMMUNITY_loading.tsx|loading.tsx]]
- [[_COMMUNITY_upload.ts|upload.ts]]
- [[_COMMUNITY_FileRoutesByPath|FileRoutesByPath]]
- [[_COMMUNITY_payments.server.ts|payments.server.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_components.json|components.json]]
- [[_COMMUNITY_dashboard.bookings.$id.tsx|dashboard.bookings.$id.tsx]]
- [[_COMMUNITY_$username.tsx|$username.tsx]]
- [[_COMMUNITY_command.tsx|command.tsx]]
- [[_COMMUNITY_menubar.tsx|menubar.tsx]]
- [[_COMMUNITY_Header.tsx|Header.tsx]]
- [[_COMMUNITY_search.tsx|search.tsx]]
- [[_COMMUNITY_client.ts|client.ts]]
- [[_COMMUNITY_booking.functions.ts|booking.functions.ts]]
- [[_COMMUNITY_email.server.ts|email.server.ts]]
- [[_COMMUNITY_track.$token.tsx|track.$token.tsx]]
- [[_COMMUNITY_gallery.functions.ts|gallery.functions.ts]]
- [[_COMMUNITY_dashboard.index.tsx|dashboard.index.tsx]]
- [[_COMMUNITY_context-menu.tsx|context-menu.tsx]]
- [[_COMMUNITY_dropdown-menu.tsx|dropdown-menu.tsx]]
- [[_COMMUNITY_dashboard.bookings.index.tsx|dashboard.bookings.index.tsx]]
- [[_COMMUNITY_faq.tsx|faq.tsx]]
- [[_COMMUNITY_table.tsx|table.tsx]]
- [[_COMMUNITY_app.tsx|app.tsx]]
- [[_COMMUNITY_breadcrumb.tsx|breadcrumb.tsx]]
- [[_COMMUNITY_drawer.tsx|drawer.tsx]]
- [[_COMMUNITY_navigation-menu.tsx|navigation-menu.tsx]]
- [[_COMMUNITY_select.tsx|select.tsx]]
- [[_COMMUNITY_MobileBottomNav.tsx|MobileBottomNav.tsx]]
- [[_COMMUNITY_card.tsx|card.tsx]]
- [[_COMMUNITY_toggle-group.tsx|toggle-group.tsx]]
- [[_COMMUNITY_guide.tsx|guide.tsx]]
- [[_COMMUNITY_onboarding.tsx|onboarding.tsx]]
- [[_COMMUNITY_input-otp.tsx|input-otp.tsx]]
- [[_COMMUNITY_alert.tsx|alert.tsx]]
- [[_COMMUNITY_WhatsAppQuickSend.tsx|WhatsAppQuickSend.tsx]]
- [[_COMMUNITY_cancellation.functions.ts|cancellation.functions.ts]]
- [[_COMMUNITY_contact.tsx|contact.tsx]]
- [[_COMMUNITY_dashboard.subscription.tsx|dashboard.subscription.tsx]]
- [[_COMMUNITY_sitemap.xml.ts|sitemap[.]xml.ts]]
- [[_COMMUNITY_badge.tsx|badge.tsx]]
- [[_COMMUNITY_tabs.tsx|tabs.tsx]]
- [[_COMMUNITY_admin.index.tsx|admin.index.tsx]]
- [[_COMMUNITY_dashboard.reports.tsx|dashboard.reports.tsx]]
- [[_COMMUNITY_for-clients.tsx|for-clients.tsx]]
- [[_COMMUNITY_terms.tsx|terms.tsx]]
- [[_COMMUNITY_router.tsx|router.tsx]]
- [[_COMMUNITY_dashboard.bookings.tsx|dashboard.bookings.tsx]]
- [[_COMMUNITY_email.functions.ts|email.functions.ts]]
- [[_COMMUNITY_Route|Route]]
- [[_COMMUNITY_Route|Route]]
- [[_COMMUNITY_Route|Route]]
- [[_COMMUNITY_trackUrlBase|trackUrlBase]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 71 edges
2. `FileRoutesByPath` - 49 edges
3. `Footer()` - 37 edges
4. `Header()` - 37 edges
5. `supabase` - 37 edges
6. `PageLoader()` - 19 edges
7. `compilerOptions` - 17 edges
8. `useConfirm()` - 14 edges
9. `useAuthState()` - 14 edges
10. `requireSupabaseAuth` - 14 edges

## Surprising Connections (you probably didn't know these)
- `cacheFirst()` --calls--> `fetch()`  [INFERRED]
  public/sw.js → src/server.ts
- `staleWhileRevalidate()` --calls--> `fetch()`  [INFERRED]
  public/sw.js → src/server.ts
- `networkFirstWithOffline()` --calls--> `fetch()`  [INFERRED]
  public/sw.js → src/server.ts
- `CalendarDayButton()` --references--> `react`  [EXTRACTED]
  src/components/ui/calendar.tsx → package.json
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json

## Import Cycles
- None detected.

## Communities (73 total, 13 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.03
Nodes (61): dependencies, class-variance-authority, @cloudflare/vite-plugin, clsx, cmdk, date-fns, embla-carousel-react, @fontsource-variable/cairo (+53 more)

### Community 1 - "routeTree.gen.ts"
Cohesion: 0.03
Nodes (60): AboutRoute, AdminIndexRoute, AdminPhotographersRoute, AdminRefundsRoute, AdminReviewsRoute, AdminRoute, AdminRouteChildren, AdminRouteWithChildren (+52 more)

### Community 2 - "types.ts"
Cohesion: 0.05
Nodes (42): APP_SHELL, CACHE_STRATEGIES, cacheFirst(), networkFirst(), networkFirstWithOffline(), staleWhileRevalidate(), attachSupabaseAuth, supabaseAdmin (+34 more)

### Community 3 - "confirm-dialog.tsx"
Cohesion: 0.06
Nodes (36): Item, ShotList(), AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+28 more)

### Community 4 - "sidebar.tsx"
Cohesion: 0.05
Nodes (40): OnboardingWizard(), STEPS, Input, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter() (+32 more)

### Community 5 - "carousel.tsx"
Cohesion: 0.05
Nodes (35): react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+27 more)

### Community 6 - "auth-middleware.ts"
Cohesion: 0.07
Nodes (25): requireSupabaseAuth, getCalendarMonthData, toggleUnavailability, createContractForBooking, getContractByToken, signContract, assertSafeIcalUrl(), parseIcalDates() (+17 more)

### Community 7 - "devDependencies"
Cohesion: 0.07
Nodes (28): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+20 more)

### Community 8 - "utils.ts"
Cohesion: 0.09
Nodes (13): Avatar, AvatarFallback, AvatarImage, Checkbox, HoverCardContent, Progress, RadioGroup, RadioGroupItem (+5 more)

### Community 9 - "Footer.tsx"
Cohesion: 0.14
Nodes (5): Footer(), Header(), Route, FEATURES, Route

### Community 10 - "cn"
Cohesion: 0.17
Nodes (17): Button, ButtonProps, buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent, PaginationEllipsis() (+9 more)

### Community 11 - "__root.tsx"
Cohesion: 0.12
Nodes (12): sonner, SmoothScroll(), readInitialTheme(), Theme, ThemeContext, ThemeContextValue, ThemeProvider(), useTheme() (+4 more)

### Community 12 - "index.tsx"
Cohesion: 0.13
Nodes (16): ScrollReveal(), ScrollRevealProps, buttonHover, buttonTap, cardHover, easeOut, fadeDown, fadeLeft (+8 more)

### Community 13 - "loading.tsx"
Cohesion: 0.18
Nodes (6): BackToDashboard(), PageLoader(), Rule, STAGES, CATEGORIES, VARIABLES

### Community 14 - "upload.ts"
Cohesion: 0.16
Nodes (19): UploadZone(), UploadZoneProps, ALLOWED_IMAGES, ALLOWED_IMAGES_AND_PDF, AllowedFileType, parseStorageError(), UploadConfig, UploadErrorType (+11 more)

### Community 15 - "FileRoutesByPath"
Cohesion: 0.10
Nodes (21): Route, Route, Route, Route, Route, Route, Route, Route (+13 more)

### Community 16 - "payments.server.ts"
Cohesion: 0.13
Nodes (12): createHyperPayProvider(), createStripeProvider(), createStripeSubscriptionCheckout(), DepositCheckoutInput, DepositCheckoutResult, getPaymentProvider(), PaymentProvider, PaymentStatus (+4 more)

### Community 17 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 18 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 19 - "dashboard.bookings.$id.tsx"
Cohesion: 0.16
Nodes (11): confirmBookingAfterDeposit, markFinalPaymentReceived, saveBookingSelectionLink, updateBookingStatus, updateProductionStage, loadBitmap(), watermarkImageFile(), WatermarkOptions (+3 more)

### Community 20 - "$username.tsx"
Cohesion: 0.14
Nodes (8): Lightbox(), PopoverContent, submitBookingRequest, optimizedImageUrl(), responsiveSrcSet(), Pricing, Profile, Route

### Community 21 - "command.tsx"
Cohesion: 0.12
Nodes (14): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut() (+6 more)

### Community 22 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 23 - "Header.tsx"
Cohesion: 0.20
Nodes (10): BottomNav(), Tab, AuthState, metadataSaysPhotographer(), Session, useAuthState(), Landing(), FEATURES (+2 more)

### Community 24 - "search.tsx"
Cohesion: 0.18
Nodes (9): GridSkeleton(), SkeletonCard(), SkeletonCardProps, listPublishedCities, SearchInput, searchPhotographers, SearchResultItem, SearchSort (+1 more)

### Community 25 - "client.ts"
Cohesion: 0.19
Nodes (5): lovable, lovableAuth, SignInOptions, supabase, signOut()

### Community 26 - "booking.functions.ts"
Cohesion: 0.17
Nodes (12): BookingItemInput, clientAddNote, clientMarkDepositSent, clientMarkReceived, getBookingByToken, getPublicDepositInfo, recordReferralAfterSignup, regenerateBookingToken (+4 more)

### Community 27 - "email.server.ts"
Cohesion: 0.46
Nodes (12): appBase(), escapeAttr(), escapeHtml(), layout(), SendArgs, tplBookingCancelled(), tplBookingReceivedForClient(), tplDepositConfirmed() (+4 more)

### Community 28 - "track.$token.tsx"
Cohesion: 0.19
Nodes (8): createDepositCheckout, createSubscriptionCheckout, isPaymentsEnabled, processDepositRefund, Booking, BOOKING_STEPS, BookingTimeline(), Route

### Community 29 - "gallery.functions.ts"
Cohesion: 0.17
Nodes (10): validateInput(), addGalleryPhoto, deleteGalleryPhoto, ensureGallery, getGalleryByToken, getGalleryForPhotographer, getMessagesByToken, isUuid() (+2 more)

### Community 30 - "dashboard.index.tsx"
Cohesion: 0.27
Nodes (4): NotificationPermission(), useCountUp(), NumStat(), Route

### Community 31 - "context-menu.tsx"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 32 - "dropdown-menu.tsx"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 33 - "dashboard.bookings.index.tsx"
Cohesion: 0.29
Nodes (6): EmptyState(), ListSkeleton(), BookingsList(), formatDate(), STATUS_COLORS, STATUS_LABELS

### Community 34 - "faq.tsx"
Cohesion: 0.31
Nodes (6): AccordionContent, AccordionItem, AccordionTrigger, clientQ, photographerQ, Route

### Community 35 - "table.tsx"
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 36 - "app.tsx"
Cohesion: 0.28
Nodes (8): AppDownloadPage(), desktopSteps, detectPlatform(), iosSteps, isStandalone(), Platform, platformHeadline, Route

### Community 37 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 38 - "drawer.tsx"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 39 - "navigation-menu.tsx"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 40 - "select.tsx"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 41 - "MobileBottomNav.tsx"
Cohesion: 0.33
Nodes (4): items, MobileBottomNav(), NavItem, Route

### Community 42 - "card.tsx"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 43 - "toggle-group.tsx"
Cohesion: 0.33
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 44 - "guide.tsx"
Cohesion: 0.29
Nodes (5): clientSteps, GuidePage(), photographerSteps, Route, Step

### Community 45 - "onboarding.tsx"
Cohesion: 0.29
Nodes (3): Form, Route, STEPS

### Community 46 - "input-otp.tsx"
Cohesion: 0.33
Nodes (5): input-otp, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 48 - "alert.tsx"
Cohesion: 0.40
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 49 - "WhatsAppQuickSend.tsx"
Cohesion: 0.60
Nodes (4): Booking, normalizePhone(), substitute(), WhatsAppQuickSend()

### Community 50 - "cancellation.functions.ts"
Cohesion: 0.40
Nodes (3): cancelBooking, clientCancelBooking, updateRefundPolicy

### Community 53 - "sitemap[.]xml.ts"
Cohesion: 0.50
Nodes (4): escapeXml(), Route, STATIC_PAGES, urlEntry()

### Community 54 - "badge.tsx"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 55 - "tabs.tsx"
Cohesion: 0.50
Nodes (3): TabsContent, TabsList, TabsTrigger

## Knowledge Gaps
- **442 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `css` (+437 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `confirm-dialog.tsx`, `sidebar.tsx`, `carousel.tsx`, `utils.ts`, `$username.tsx`, `command.tsx`, `menubar.tsx`, `search.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `faq.tsx`, `table.tsx`, `breadcrumb.tsx`, `drawer.tsx`, `navigation-menu.tsx`, `select.tsx`, `card.tsx`, `toggle-group.tsx`, `input-otp.tsx`, `alert.tsx`, `badge.tsx`, `tabs.tsx`?**
  _High betweenness centrality (0.235) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `__root.tsx`, `carousel.tsx`, `input-otp.tsx`, `devDependencies`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Why does `react` connect `carousel.tsx` to `dependencies`, `cn`, `sidebar.tsx`, `upload.ts`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _442 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03278688524590164 - nodes in this community are weakly interconnected._
- **Should `routeTree.gen.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03278688524590164 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05387205387205387 - nodes in this community are weakly interconnected._