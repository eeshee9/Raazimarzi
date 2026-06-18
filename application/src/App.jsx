// src/App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CaseManagerDashboard from "./pages/CaseManagerDashboard";
import CreateCase from "./pages/CreateCase";
import MyProfile from "./pages/MyProfile";
import EditProfile from "./pages/EditProfile";
import FileNewCaseStep1 from "./pages/FileNewCaseStep1";
import FileNewCaseStep2 from "./pages/FileNewCaseStep2";
import FileNewCaseStep3 from "./pages/FileNewCaseStep3";
import UserMyCases from "./pages/UserMyCases";
import UserCaseDetails from "./pages/UserCaseDetails";
import AdminNewCases from "./pages/AdminNewCases";
import AdminCaseDetails from "./pages/AdminCaseDetails";
import AdminNewCasesNextPage from "./pages/AdminNewCasesNextPage";
import UserCaseMeetings from "./pages/UserCaseMeetings";
import UserCaseMeetingsNextPage from "./pages/UserCaseMeetingsNextPage";
import UserMeetingLobby from "./pages/UserMeetingLobby";
import UserMeetingCall from "./pages/UserMeetingCall";
import UserChats from "./pages/UserChats";
import UserDocuments from "./pages/UserDocuments";
import UserPayments from "./pages/UserPayments";
import UserSupport from "./pages/UserSupport";
import AdminCaseMeetings from "./pages/AdminCaseMeetings";
import AdminMeetingLobby from "./pages/AdminMeetingLobby";
import AdminMeetingCall  from "./pages/AdminMeetingCall";
import AdminDocuments from "./pages/AdminDocuments";
import AdminDocumentFolder from "./pages/AdminDocumentFolder";
import AdminDocumentViewer from "./pages/AdminDocumentViewer";
import AdminUsers from "./pages/AdminUsers";
import AdminUserDetails from "./pages/AdminUserDetails";
import AdminMediators from "./pages/AdminMediators";
import AdminMediatorDetails from "./pages/AdminMediatorDetails";
import AdminSupport from "./pages/AdminSupport";
import AdminSupportTicket from "./pages/AdminSupportTicket";
import AdminMessages from "./pages/AdminMessages";
import AdminPayments from "./pages/AdminPayments";
import AdminPaymentDetails from "./pages/AdminPaymentDetails";
import AdminProfile from "./pages/AdminProfile";
import CaseManagerNewCases from "./pages/CaseManagerNewCases";
import CaseManagerCaseMeetings from "./pages/CaseManagerCaseMeetings";
import CaseManagerChats from "./pages/CaseManagerChats";
import MediatorDashboard from "./pages/MediatorDashboard";
import MediatorMyCases from "./pages/MediatorMyCases";
import MediatorCaseMeetings from "./pages/MediatorCaseMeetings";
import MediatorChats from "./pages/MediatorChats";
import ForgotPassword from "./pages/ForgotPassword";
import { CaseProvider } from "./context/caseContext";
import { UserProvider } from "./context/userContext";

function App() {
  return (
    <Router basename="/app">
      <UserProvider>
        <CaseProvider>
          <Routes>
            {/* Auth */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgotpassword" element={<ForgotPassword />} />

            {/* User Routes — protected (token + role=user required) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/user/dashboard" element={<UserDashboard />} />
              <Route path="/user/create-case" element={<CreateCase />} />
              <Route path="/user/my-profile" element={<MyProfile />} />
              <Route path="/user/edit-profile" element={<EditProfile />} />
              <Route path="/user/file-new-case/step1" element={<FileNewCaseStep1 />} />
              <Route path="/user/file-new-case/step2" element={<FileNewCaseStep2 />} />
              <Route path="/user/file-new-case/step3" element={<FileNewCaseStep3 />} />
              <Route path="/user/my-cases" element={<UserMyCases />} />
              <Route path="/user/my-cases/details/:id" element={<UserCaseDetails />} />
              <Route path="/user/documents" element={<UserDocuments />} />
              <Route path="/user/payments" element={<UserPayments />} />
              <Route path="/user/payments/invoice/:id" element={<UserPayments />} />
              <Route path="/user/support" element={<UserSupport />} />
              <Route path="/user/chats" element={<UserChats />} />
              <Route path="/user/case-meetings" element={<UserCaseMeetings />} />
              <Route path="/user/meetings/lobby/:id" element={<UserMeetingLobby />} />
              <Route path="/user/meetings/call/:id" element={<UserMeetingCall />} />
              <Route path="/user/case-meetings/call" element={<UserCaseMeetingsNextPage />} />
            </Route>

            {/* Mediator Routes */}
            <Route path="/mediator/dashboard" element={<MediatorDashboard />} />
            <Route path="/mediator/case-meetings" element={<MediatorCaseMeetings />} />
            <Route path="/mediator/chats" element={<MediatorChats />} />
            <Route path="/mediator/my-cases" element={<MediatorMyCases />} />

            {/* Case Manager Routes */}
            <Route path="/cm/dashboard" element={<CaseManagerDashboard />} />
            <Route path="/cm/new-cases" element={<CaseManagerNewCases />} />
            <Route path="/cm/case-meetings" element={<CaseManagerCaseMeetings />} />
            <Route path="/cm/chats" element={<CaseManagerChats />} />

            {/* Admin Routes — admin only */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/new-cases" element={<AdminNewCases />} />
              <Route path="/admin/view-details/:id" element={<AdminCaseDetails />} />
              <Route path="/admin/new-cases-next-page" element={<AdminNewCasesNextPage />} />
              <Route path="/admin/case-meetings" element={<AdminCaseMeetings />} />
              <Route path="/admin/meetings/lobby/:id" element={<AdminMeetingLobby />} />
              <Route path="/admin/meetings/call/:id"  element={<AdminMeetingCall />} />
              <Route path="/admin/documents" element={<AdminDocuments />} />
              <Route path="/admin/documents/folder/:caseId" element={<AdminDocumentFolder />} />
              <Route path="/admin/documents/view/:documentId" element={<AdminDocumentViewer />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/users/:id" element={<AdminUserDetails />} />
              <Route path="/admin/mediators" element={<AdminMediators />} />
              <Route path="/admin/mediators/:id" element={<AdminMediatorDetails />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              <Route path="/admin/support/:id" element={<AdminSupportTicket />} />
              <Route path="/admin/messages" element={<AdminMessages />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/payments/:id" element={<AdminPaymentDetails />} />
            </Route>

            {/* Admin Profile — admin or sub-admin (sub-admins manage their own profile) */}
            <Route element={<ProtectedRoute allowedRoles={["admin", "sub-admin"]} />}>
              <Route path="/admin/profile" element={<AdminProfile />} />
            </Route>
          </Routes>
        </CaseProvider>
      </UserProvider>
    </Router>
  );
}

export default App;
