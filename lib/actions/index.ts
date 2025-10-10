"use server"

import { signIn, signUp, createAdminUser, signOutServerAction } from "./auth"
import {
  inviteUser,
  approveUserServerAction,
  rejectUserServerAction,
  updatePendingUserFields,
  updateUserFields,
  deleteUserCompletely,
  updateProfile,
  changePassword,
  fetchPendingUsers,
  fetchUnconfirmedEmailUsers,
  resendConfirmationEmail,
} from "./users"
import { incrementVideoViews, saveVideo } from "./videos"
import { addPerformer, updatePerformer, deletePerformer } from "./performers"
import { fetchNotificationsWithSenders, sendNotificationWithEmail } from "./notifications"
import { getTelemetryData, clearAuthDebugLogs, fetchAuthDebugLogs } from "./admin"
import { logAuditEvent, fetchAuditLogs, clearAuditLogs } from "./audit"

export {
  signIn,
  signUp,
  createAdminUser,
  signOutServerAction,
  inviteUser,
  approveUserServerAction,
  rejectUserServerAction,
  updatePendingUserFields,
  updateUserFields,
  deleteUserCompletely,
  updateProfile,
  changePassword,
  fetchPendingUsers,
  fetchUnconfirmedEmailUsers,
  resendConfirmationEmail,
  incrementVideoViews,
  saveVideo,
  addPerformer,
  updatePerformer,
  deletePerformer,
  fetchNotificationsWithSenders,
  sendNotificationWithEmail,
  getTelemetryData,
  clearAuthDebugLogs,
  fetchAuthDebugLogs,
  logAuditEvent,
  fetchAuditLogs,
  clearAuditLogs,
}
