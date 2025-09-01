 // Context-based (uses user's businesses)
  GET /api/v1/businesses/my-business     // User's accessible businesses
  GET /api/v1/businesses/my-services    // Services from user's businesses
  GET /api/v1/businesses/my/stats       // Stats across user's businesses
  GET /api/v1/appointments/my-appointments  // User's business appointments
  GET /api/v1/appointments/my/today     // Today's appointments across businesses
  GET /api/v1/appointments/my/stats     // Appointment stats across businesses

  // Admin routes (still require explicit businessId)
  GET /api/v1/businesses/:id/stats      // Specific business stats
  GET /api/v1/appointments/business/:businessId/today

   1. POST /api/v1/closures/my - Create a closure for your business
  2. GET /api/v1/closures/my - Get closures for your business
  3. POST /api/v1/closures/my/emergency - Create an emergency closure
  4. POST /api/v1/closures/my/maintenance - Create a maintenance closure