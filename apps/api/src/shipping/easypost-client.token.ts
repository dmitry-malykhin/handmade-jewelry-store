// Injection token for the EasyPostClient. Kept in its own file to avoid
// circular imports between the service, the mock implementation and the
// (eventual) real implementation.
export const EASYPOST_CLIENT = Symbol('EASYPOST_CLIENT')
