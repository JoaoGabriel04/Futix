// Script-mode declaration file — extends the Express namespace so both
// passport's req.user and our custom req.userId are typed globally.
declare namespace Express {
  interface User {
    user: import("@prisma/client").User;
    isNew: boolean;
  }
  interface Request {
    userId: string;
    memberRole?: string;
    /** Set by the OAuth link pre-middleware when ?link=1 flow is detected */
    linkUserId?: string;
  }
}
