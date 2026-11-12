/** Administration persistence boundary. Admin routes do not reach storage directly. */
export {
  adminConversations,
  adminMessages,
  adminProfiles,
  adminConversationStats,
  listAdmins,
  lookupTelegramUser,
  upsertAdmin,
  deleteAdmin,
  markProfileOfflineBefore,
  isStoredAdmin,
} from '../../../lib/storage'
