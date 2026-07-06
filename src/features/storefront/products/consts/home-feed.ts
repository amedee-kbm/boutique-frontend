// Page size for the home feed's server-side pagination. Its own module so both
// the server action and the client list can import it without either pulling in
// the other's server-only / client-only code.
export const HOME_PAGE_SIZE = 12
