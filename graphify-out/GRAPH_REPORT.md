# Graph Report - memoria  (2026-10-04)

## Corpus Check
- 264 files · ~149,504 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1166 nodes · 2139 edges · 77 communities (71 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.55)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `976e68ea`
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
- [[_COMMUNITY_dashboard.profile.tsx|dashboard.profile.tsx]]
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
- [[_COMMUNITY_ScrollReveal.tsx|ScrollReveal.tsx]]
- [[_COMMUNITY_production-rules.ts|production-rules.ts]]
- [[_COMMUNITY__authenticated.tsx|_authenticated.tsx]]
- [[_COMMUNITY_apply_ux.js|apply_ux.js]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 71 edges
2. `FileRoutesByPath` - 60 edges
3. `supabase` - 40 edges
4. `Footer()` - 38 edges
5. `Header()` - 37 edges
6. `PageLoader()` - 29 edges
7. `useAuthState()` - 18 edges
8. `compilerOptions` - 17 edges
9. `useConfirm()` - 16 edges
10. `requireSupabaseAuth` - 15 edges

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

## Communities (77 total, 6 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.03
Nodes (66): dependencies, browser-image-compression, canvas-confetti, class-variance-authority, @cloudflare/vite-plugin, clsx, cmdk, date-fns (+58 more)

### Community 1 - "routeTree.gen.ts"
Cohesion: 0.03
Nodes (76): Route, AboutRoute, ApiPublicHooksEmailRemindersRoute, ApiPublicHooksIcalSyncRoute, ApiPublicHooksPaymentRoute, ApiPublicIcalTokenRoute, AppRoute, AuthenticatedAdminAuditLogRoute (+68 more)

### Community 2 - "types.ts"
Cohesion: 0.06
Nodes (34): APP_SHELL, CACHE_STRATEGIES, cacheFirst(), networkFirst(), networkFirstWithOffline(), staleWhileRevalidate(), attachSupabaseAuth, AdminClient (+26 more)

### Community 3 - "confirm-dialog.tsx"
Cohesion: 0.13
Nodes (19): Alert, AlertDescription, AlertTitle, alertVariants, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription (+11 more)

### Community 4 - "sidebar.tsx"
Cohesion: 0.05
Nodes (40): OnboardingWizard(), STEPS, Input, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter() (+32 more)

### Community 5 - "carousel.tsx"
Cohesion: 0.07
Nodes (24): react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+16 more)

### Community 6 - "auth-middleware.ts"
Cohesion: 0.12
Nodes (12): requireSupabaseAuth, getCalendarMonthData, toggleUnavailability, cancelBooking, clientCancelBooking, updateRefundPolicy, sendGalleryDeliveredEmail, logMove (+4 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (36): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+28 more)

### Community 8 - "utils.ts"
Cohesion: 0.07
Nodes (16): Avatar, AvatarFallback, AvatarImage, Checkbox, HoverCardContent, Progress, RadioGroup, RadioGroupItem (+8 more)

### Community 9 - "Footer.tsx"
Cohesion: 0.09
Nodes (6): Footer(), Header(), FEATURES, Route, Route, Route

### Community 10 - "cn"
Cohesion: 0.14
Nodes (20): Badge(), BadgeProps, badgeVariants, Button, ButtonProps, buttonVariants, Calendar(), CalendarDayButton() (+12 more)

### Community 11 - "__root.tsx"
Cohesion: 0.16
Nodes (8): lenis, sonner, PwaInstallPrompt(), SmoothScroll(), ConfirmProvider(), Toaster(), ToasterProps, RootComponent()

### Community 12 - "index.tsx"
Cohesion: 0.12
Nodes (14): buttonHover, buttonTap, cardHover, easeOut, fadeDown, fadeLeft, fadeRight, fadeUp (+6 more)

### Community 13 - "loading.tsx"
Cohesion: 0.20
Nodes (5): BackToDashboard(), PageLoader(), Rule, Payment, Sub

### Community 14 - "upload.ts"
Cohesion: 0.18
Nodes (17): UploadZone(), UploadZoneProps, ALLOWED_IMAGES, ALLOWED_IMAGES_AND_PDF, AllowedFileType, parseStorageError(), UploadConfig, UploadErrorType (+9 more)

### Community 15 - "FileRoutesByPath"
Cohesion: 0.07
Nodes (22): Route, Route, Route, Route, Route, Route, Route, Route (+14 more)

### Community 16 - "payments.server.ts"
Cohesion: 0.11
Nodes (13): createHyperPayProvider(), createStripeProvider(), createStripeSubscriptionCheckout(), DepositCheckoutInput, DepositCheckoutResult, getPaymentProvider(), PaymentProvider, PaymentStatus (+5 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (26): adminDeletePhotographer, adminGrantRole, adminRenewSubscription, adminResolveDispute, adminRestorePhotographer, adminRevokeRole, adminSoftDeletePhotographer, adminTogglePublish (+18 more)

### Community 18 - "components.json"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 19 - "dashboard.bookings.$id.tsx"
Cohesion: 0.14
Nodes (14): markFinalPaymentReceived, saveBookingSelectionLink, saveDeliveryLink, updateBookingStatus, updateProductionStage, loadBitmap(), watermarkImageFile(), WatermarkOptions (+6 more)

### Community 20 - "$username.tsx"
Cohesion: 0.11
Nodes (11): Lightbox(), PopoverContent, optimizedImageUrl(), responsiveSrcSet(), getPhotographerProfileData, hapticVibrate(), DepositCard(), Pricing (+3 more)

### Community 21 - "command.tsx"
Cohesion: 0.12
Nodes (14): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut() (+6 more)

### Community 22 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 23 - "Header.tsx"
Cohesion: 0.11
Nodes (18): BottomNav(), Tab, items, MobileBottomNav(), NavItem, MobileTabBar(), AuthState, metadataSaysPhotographer() (+10 more)

### Community 24 - "search.tsx"
Cohesion: 0.17
Nodes (13): CompareMode(), GridSkeleton(), listPublishedCities, SearchInput, searchPhotographers, SearchResultItem, SearchSort, typoCorrect() (+5 more)

### Community 25 - "client.ts"
Cohesion: 0.24
Nodes (11): PremiumLock(), useSubscriptionLock(), createSupabaseClient(), supabase, brokeredPreviewStorage(), Contracts(), ReportsPage(), statusLabel() (+3 more)

### Community 26 - "booking.functions.ts"
Cohesion: 0.14
Nodes (14): BookingItemInput, clientMarkDepositSent, confirmBookingAfterDeposit, getBookingByToken, getPublicDepositInfo, recordReferralAfterSignup, regenerateBookingToken, softDeleteBooking (+6 more)

### Community 27 - "email.server.ts"
Cohesion: 0.43
Nodes (13): appBase(), escapeAttr(), escapeHtml(), layout(), SendArgs, tplBookingCancelled(), tplBookingReceivedForClient(), tplDepositConfirmed() (+5 more)

### Community 28 - "track.$token.tsx"
Cohesion: 0.15
Nodes (11): clientAddNote, clientMarkReceived, getGalleryByToken, createDepositCheckout, createSubscriptionCheckout, isPaymentsEnabled, reconcilePaymentStatus, Booking (+3 more)

### Community 29 - "gallery.functions.ts"
Cohesion: 0.18
Nodes (9): validateInput(), addGalleryPhoto, deleteGalleryPhoto, ensureGallery, getGalleryForPhotographer, getMessagesByToken, isUuid(), sendMessageByToken (+1 more)

### Community 30 - "dashboard.index.tsx"
Cohesion: 0.13
Nodes (8): NotificationPermission(), PullToRefresh(), PullToRefreshProps, useCountUp(), signOut(), Card(), NumStat(), Route

### Community 31 - "context-menu.tsx"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 32 - "dropdown-menu.tsx"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 33 - "dashboard.bookings.index.tsx"
Cohesion: 0.23
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
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

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
Cohesion: 0.20
Nodes (16): ClientTour(), getTourState(), HIDDEN_PREFIXES, resetTour(), saveTourState(), startTour(), Step, STEPS (+8 more)

### Community 46 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 47 - "dashboard.profile.tsx"
Cohesion: 0.15
Nodes (11): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+3 more)

### Community 48 - "alert.tsx"
Cohesion: 0.18
Nodes (6): raiseDispute, requestVerification, resolveDispute, updateNotificationPreferences, verifyPhotographerStatus, Route

### Community 49 - "WhatsAppQuickSend.tsx"
Cohesion: 0.60
Nodes (4): Booking, normalizePhone(), substitute(), WhatsAppQuickSend()

### Community 50 - "cancellation.functions.ts"
Cohesion: 0.22
Nodes (9): Item, ShotList(), useConfirm(), processDepositRefund, AdminPhotographers(), AdminRefundsPage(), Route, BookingDetail() (+1 more)

### Community 51 - "contact.tsx"
Cohesion: 0.20
Nodes (9): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Tables, TablesInsert (+1 more)

### Community 52 - "dashboard.subscription.tsx"
Cohesion: 0.31
Nodes (7): readInitialTheme(), Theme, ThemeContext, ThemeContextValue, ThemeProvider(), useTheme(), ThemeToggle()

### Community 53 - "sitemap[.]xml.ts"
Cohesion: 0.50
Nodes (4): escapeXml(), Route, STATIC_PAGES, urlEntry()

### Community 54 - "badge.tsx"
Cohesion: 0.25
Nodes (5): adminApproveReview, adminRejectReview, listReviewsAdmin, Route, Row

### Community 55 - "tabs.tsx"
Cohesion: 0.25
Nodes (5): adminApproveSubscriptionPayment, adminRejectSubscriptionPayment, listSubscriptionPaymentsAdmin, PaymentRow, Route

### Community 56 - "admin.index.tsx"
Cohesion: 0.29
Nodes (4): adminCancelBooking, listBookingsAdmin, BookingRow, Route

### Community 58 - "for-clients.tsx"
Cohesion: 0.38
Nodes (4): createContractForBooking, getContractByToken, signContract, Route

### Community 59 - "terms.tsx"
Cohesion: 0.43
Nodes (5): assertSafeIcalUrl(), parseIcalDates(), runIcalSyncForUser(), syncExternalIcal, Route

### Community 61 - "router.tsx"
Cohesion: 0.38
Nodes (5): initMonitoring(), getRouter(), Register, routeTree, startInstance

### Community 62 - "dashboard.bookings.tsx"
Cohesion: 0.33
Nodes (4): adminDeleteNotification, listNotificationsAdmin, Route, Row

### Community 64 - "email.functions.ts"
Cohesion: 0.33
Nodes (4): listReferralsAdmin, Route, Row, STATUS_LABEL

### Community 66 - "Route"
Cohesion: 0.40
Nodes (3): listContractsAdmin, Route, Row

### Community 73 - "ScrollReveal.tsx"
Cohesion: 0.50
Nodes (3): directionVariants, ScrollReveal(), ScrollRevealProps

### Community 74 - "production-rules.ts"
Cohesion: 0.83
Nodes (3): canMoveBooking(), getStageOrder(), STAGES_ORDER

## Knowledge Gaps
- **478 isolated node(s):** `fs`, `css`, `$schema`, `style`, `rsc` (+473 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `__root.tsx`, `carousel.tsx`, `devDependencies`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `confirm-dialog.tsx`, `sidebar.tsx`, `carousel.tsx`, `utils.ts`, `$username.tsx`, `command.tsx`, `menubar.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `faq.tsx`, `table.tsx`, `breadcrumb.tsx`, `drawer.tsx`, `navigation-menu.tsx`, `select.tsx`, `card.tsx`, `toggle-group.tsx`, `input-otp.tsx`, `dashboard.profile.tsx`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `react` connect `carousel.tsx` to `dependencies`, `cn`, `sidebar.tsx`, `upload.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `fs`, `css`, `$schema` to the rest of the system?**
  _478 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.030303030303030304 - nodes in this community are weakly interconnected._
- **Should `routeTree.gen.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02631578947368421 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06382978723404255 - nodes in this community are weakly interconnected._