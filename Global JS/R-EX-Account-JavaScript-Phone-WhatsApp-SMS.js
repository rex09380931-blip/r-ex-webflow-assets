
/* ==========================================
   R-EX ACCOUNT MODAL
========================================== */

function initAccount() {
  const accountBtn = document.getElementById("accountBtn");
  const accountBtnIcon =
     document.getElementById(
       "accountBtnIcon"
      );

  const accountBtnAvatar =
     document.getElementById(
      "accountBtnAvatar"
     );
  const modal = document.getElementById("accountModal");
  const overlay = document.getElementById("accountOverlay");
  const close = document.getElementById("accountClose");

  const tabs = document.querySelectorAll(".account-tab");
  const tabsContainer = document.querySelector(".account-tabs");
  const linksContainer = document.querySelector(".account-links");

  const emailInput = document.getElementById("accountInput");
  const passwordInput = document.getElementById("passwordInput");
  const confirmPasswordInput =
    document.getElementById("confirmPasswordInput");
  const confirmPasswordField =
    document.getElementById("confirmPasswordField");
  const emailInputLabel = document.getElementById("accountInputLabel");
  const passwordField = passwordInput?.closest(".account-field");
  const phoneOtpField = document.getElementById("phoneOtpField");
  const phoneOtpInput = document.getElementById("phoneOtpInput");
  const phoneSmsFallback = document.getElementById("phoneSmsFallback");
  const phoneChangeNumber = document.getElementById("phoneChangeNumber");

  const subtitle = document.getElementById("accountSubtitle");

  const form = document.getElementById("accountForm");
  const submitBtn = document.getElementById("accountSubmit");

  const toggleAuth = document.getElementById("toggleAuth");
  const forgotPassword = document.getElementById("forgotPassword");
  const message = document.getElementById("accountMessage");

  const userPanel = document.getElementById("accountUserPanel");
  const userEmail = document.getElementById("accountUserEmail");
  const logoutBtn = document.getElementById("logoutBtn");
  const googleAuthOption = document.getElementById("accountGoogleOption");
  const googleSignInButton = document.getElementById("googleSignInButton");

  const resetPasswordForm =
    document.getElementById("resetPasswordForm");

  const newPasswordInput =
    document.getElementById("newPasswordInput");

  const confirmNewPasswordInput =
    document.getElementById("confirmNewPasswordInput");

  if (
    !accountBtn ||
    !accountBtnIcon ||
    !accountBtnAvatar ||
    !modal ||
    !overlay ||
    !close ||
    !tabsContainer ||
    !linksContainer ||
    !emailInput ||
    !passwordInput ||
    !confirmPasswordInput ||
    !confirmPasswordField ||
    !emailInputLabel ||
    !passwordField ||
    !phoneOtpField ||
    !phoneOtpInput ||
    !phoneSmsFallback ||
    !phoneChangeNumber ||
    !subtitle ||
    !form ||
    !submitBtn ||
    !toggleAuth ||
    !forgotPassword ||
    !message ||
    !userPanel ||
    !userEmail ||
    !logoutBtn ||
    !googleAuthOption ||
    !googleSignInButton ||
    !resetPasswordForm ||
    !newPasswordInput ||
    !confirmNewPasswordInput
  ) {
    return;
  }

  // Google OAuth may return to this page through the browser back button.
  // Restore the button if the browser kept the page in its back-forward cache.
  window.addEventListener("pageshow", () => {
    if (message?.textContent.trim().startsWith("Redirecting to Google")) {
      // If Google sign-in was canceled, return the modal to its sign-in state.
      setMode("signin");
      googleSignInButton.disabled = false;
      message.classList.remove(
        "account-message-success",
        "account-message-error"
      );
    }
  });

  if (
    typeof rexSupabase === "undefined" ||
    !rexSupabase?.auth
  ) {
    console.error("[R-EX] Supabase was not initialized.");
    return;
  }

  let mode = "signin";
  let authType = "email";
  let currentUser = null;
  let phoneOtpStage = "phone";
  let activePhone = "";
  let phoneSmsTimer = null;

  const urlParams =
    new URLSearchParams(window.location.search);

  const isPasswordRecovery =
    urlParams.get("reset-password") === "1" ||
    window.location.hash.includes("type=recovery");


  /* ==========================================
     MESSAGE
  ========================================== */

  function setMessage(text, type = "") {
    message.textContent = text;

    message.classList.remove(
      "account-message-success",
      "account-message-error"
    );

    if (type) {
      message.classList.add(type);
    }
  }

  function normalizeUaeMobile(rawValue) {
    const value = rawValue.trim().replace(/[\s().-]/g, "");
    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("00971")) digits = digits.slice(2);
    if (digits.startsWith("0") && digits.length === 10) digits = "971" + digits.slice(1);
    if (digits.length === 9 && digits.startsWith("5")) digits = "971" + digits;

    if (!/^9715\d{8}$/.test(digits)) return null;
    return "+" + digits;
  }

  function clearPhoneSmsTimer() {
    if (phoneSmsTimer) {
      clearInterval(phoneSmsTimer);
      phoneSmsTimer = null;
    }
  }

  function resetPhoneOtpFlow() {
    clearPhoneSmsTimer();
    phoneOtpStage = "phone";
    activePhone = "";
    phoneOtpInput.value = "";
    phoneOtpInput.required = false;
    phoneOtpField.style.display = "none";
    phoneSmsFallback.style.display = "none";
    phoneSmsFallback.disabled = true;
    phoneChangeNumber.style.display = "none";
    emailInput.readOnly = false;
    toggleAuth.style.display = "";
    submitBtn.disabled = false;
  }

  function startPhoneSmsCountdown(seconds = 30, afterSms = false) {
    clearPhoneSmsTimer();
    let remaining = seconds;
    phoneSmsFallback.style.display = "block";
    phoneSmsFallback.disabled = true;
    phoneSmsFallback.textContent = afterSms
      ? `Resend SMS in ${remaining} seconds`
      : `Send SMS in ${remaining} seconds`;

    phoneSmsTimer = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        phoneSmsFallback.textContent = afterSms
          ? `Resend SMS in ${remaining} seconds`
          : `Send SMS in ${remaining} seconds`;
        return;
      }

      clearPhoneSmsTimer();
      phoneSmsFallback.disabled = false;
      phoneSmsFallback.textContent = afterSms
        ? "Resend code by SMS"
        : "Send code by SMS";
    }, 1000);
  }

function updateAccountButtonAvatar(
  avatarUrl
) {
  if (avatarUrl) {
    const separator =
      avatarUrl.includes("?")
        ? "&"
        : "?";

    accountBtnAvatar.src =
      `${avatarUrl}${separator}v=${Date.now()}`;

    accountBtnAvatar.hidden = false;
    accountBtnIcon.hidden = true;

    return;
  }

  accountBtnAvatar.removeAttribute(
    "src"
  );

  accountBtnAvatar.hidden = true;
  accountBtnIcon.hidden = false;
}

async function loadAccountAvatar(user) {
  if (!user?.id) {
    updateAccountButtonAvatar(null);
    return;
  }

  try {
    const {
      data: profile,
      error
    } = await rexSupabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    updateAccountButtonAvatar(
      profile?.avatar_url || null
    );
  } catch (error) {
    console.error(
      "[R-EX] Could not load account avatar:",
      error
    );

    updateAccountButtonAvatar(null);
  }
}


  /* ==========================================
     AUTH MODE
  ========================================== */

  function setMode(newMode) {
    mode = newMode;

    passwordInput.value = "";
    confirmPasswordInput.value = "";

    const isPhone = authType === "phone";
    const isSignup = mode === "signup";

     toggleAuth.style.display = isPhone ? "none" : "";

    confirmPasswordField.style.display =
      !isPhone && isSignup ? "flex" : "none";
    confirmPasswordInput.style.setProperty(
      "display",
      !isPhone && isSignup ? "block" : "none",
      "important"
    );
    confirmPasswordInput.required = !isPhone && isSignup;
    passwordInput.required = !isPhone;
    passwordField.style.display = isPhone ? "none" : "flex";

    submitBtn.textContent = isPhone
      ? (phoneOtpStage === "otp" ? "VERIFY CODE" : "SEND WHATSAPP CODE")
      : (isSignup ? "CREATE ACCOUNT" : "SIGN IN");

    toggleAuth.textContent = isSignup
      ? "Already have an account?"
      : "Create Account";

    forgotPassword.style.display = isPhone || isSignup ? "none" : "inline";

    setMessage(
      isPhone
        ? (isSignup ? "Create your account with your UAE mobile number." : "Sign in with your UAE mobile number.")
        : (isSignup ? "Create your R-EX account." : "By continuing, you agree to receive account emails.")
    );
  }


  /* ==========================================
     SHOW AUTH FORM
  ========================================== */

  function showAuthForm() {
    form.style.display = "flex";
    tabsContainer.style.display = "flex";
    linksContainer.style.display = "flex";
    googleAuthOption.style.display = "block";

    message.style.display = "block";

    subtitle.textContent = "Access your R-EX account.";
    subtitle.style.color = "";
    subtitle.style.fontWeight = "";
    subtitle.style.letterSpacing = "";
    subtitle.style.display = "block";

    resetPasswordForm.style.display = "none";
    userPanel.style.display = "none";
  }


  /* ==========================================
     SHOW USER PANEL
  ========================================== */

  function showUserPanel(user) {
    currentUser = user;

    form.style.display = "none";
    tabsContainer.style.display = "none";
    linksContainer.style.display = "none";
    googleAuthOption.style.display = "none";
    resetPasswordForm.style.display = "none";

    message.style.display = "none";

    subtitle.textContent = "WELCOME BACK";
    subtitle.style.color = "var(--rex-green)";
    subtitle.style.fontWeight = "700";
    subtitle.style.letterSpacing = "3px";
    subtitle.style.display = "block";

    userPanel.style.display = "block";

    userEmail.textContent =
      user?.email || "R-EX Member";
  }


  /* ==========================================
     RESET PASSWORD FORM
  ========================================== */

  function showResetPasswordForm() {
    form.style.display = "none";
    tabsContainer.style.display = "none";
    linksContainer.style.display = "none";
    googleAuthOption.style.display = "none";
    userPanel.style.display = "none";

    message.style.display = "block";

    subtitle.textContent = "RESET PASSWORD";
    subtitle.style.color = "var(--rex-green)";
    subtitle.style.fontWeight = "700";
    subtitle.style.letterSpacing = "3px";
    subtitle.style.display = "block";

    resetPasswordForm.style.display = "flex";

    newPasswordInput.value = "";
    confirmNewPasswordInput.value = "";

    setMessage("Enter your new password.");
  }


  /* ==========================================
     OPEN / CLOSE
  ========================================== */

  let accountReturnFocus = null;

  const accountFocusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");

  function getAccountFocusableElements() {
    return Array.from(
      modal.querySelectorAll(accountFocusableSelector)
    ).filter(element =>
      !element.hasAttribute("hidden") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0
    );
  }

  function focusFirstAccountElement() {
    const focusable = getAccountFocusableElements();
    (focusable[0] || modal).focus({ preventScroll: true });
  }

  function trapAccountTab(event) {
    const focusable = getAccountFocusableElements();

    if (!focusable.length) {
      event.preventDefault();
      modal.focus({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const focusIsOutside = !modal.contains(document.activeElement);

    if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || focusIsOutside)) {
      event.preventDefault();
      first.focus();
    }
  }

  function openAccount() {
    if (!modal.classList.contains("active")) {
      accountReturnFocus = document.activeElement;
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    overlay.classList.add("active");

    document.body.classList.add("menu-open");

    if (isPasswordRecovery) {
      showResetPasswordForm();
    } else if (currentUser) {
      showUserPanel(currentUser);
    } else {
      showAuthForm();
      setMode("signin");
    }

    requestAnimationFrame(focusFirstAccountElement);
  }

  function closeAccount() {
    if (!modal.classList.contains("active")) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    overlay.classList.remove("active");

    document.body.classList.remove("menu-open");

    const returnTarget = accountReturnFocus;
    accountReturnFocus = null;

    requestAnimationFrame(() => {
      if (returnTarget && returnTarget.isConnected && typeof returnTarget.focus === "function") {
        returnTarget.focus({ preventScroll: true });
      } else if (accountBtn.isConnected) {
        accountBtn.focus({ preventScroll: true });
      }
    });
  }


  /* ==========================================
     CHECK CURRENT SESSION
  ========================================== */

  async function checkSession() {
    const {
      data,
      error
    } = await rexSupabase.auth.getSession();

    if (error) {
      console.error(
        "[R-EX] Could not read account session:",
        error
      );

      currentUser = null;
      showAuthForm();
      return;
    }

    const user =
      data?.session?.user || null;

    /*
     * رابط Reset Password ينشئ جلسة مؤقتة.
     * بهالحالة لازم نعرض حقول كلمة المرور الجديدة.
     */
    if (isPasswordRecovery && user) {
      currentUser = user;

      openAccount();
      showResetPasswordForm();
      return;
    }

   if (user) {

  // تحقق من أن المستخدم ما زال موجوداً في Supabase
  const {
    data: userData,
    error: userError
  } = await rexSupabase.auth.getUser();

  if (userError || !userData.user) {

    console.warn(
      "[R-EX] Session is invalid. Signing out..."
    );

    await rexSupabase.auth.signOut();

    currentUser = null;

    updateAccountButtonAvatar(null);

    showAuthForm();

    return;
  }

  currentUser = userData.user;

  await loadAccountAvatar(userData.user);

  showUserPanel(userData.user);

  return;
}

    currentUser = null;
    updateAccountButtonAvatar(null);
    showAuthForm();
  }


  /* ==========================================
     ACCOUNT BUTTON
  ========================================== */

  accountBtn.addEventListener("click", async function () {
  if (isPasswordRecovery) {
    openAccount();
    showResetPasswordForm();
    return;
  }

  if (currentUser) {

    // ===== Check if Admin =====
    const ADMIN_EMAIL = "r.ex09380931@gmail.com";

    if (
      currentUser.email &&
      currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    ) {
      window.location.href = "/admin";
      return;
    }

    // ===== Normal User =====
    window.location.href = "/account";
    return;
  }

  openAccount();
});

  googleSignInButton.addEventListener("click", async function () {
    if (googleSignInButton.disabled) return;

    googleSignInButton.disabled = true;
    setMessage("Redirecting to Google...");

    try {
      const redirectTo =
        window.location.origin +
        window.location.pathname +
        window.location.search;

      const { error } = await rexSupabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });

      if (error) throw error;
    } catch (error) {
      console.error("[R-EX] Google sign-in failed:", error);
      setMessage(
        error.message || "Could not sign in with Google. Please try again.",
        "account-message-error"
      );
      googleSignInButton.disabled = false;
    }
  });

  close.addEventListener("click", closeAccount);
  overlay.addEventListener("click", closeAccount);


  /* ==========================================
     EMAIL / PHONE TABS
  ========================================== */

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (otherTab) {
        otherTab.classList.remove("active");
      });

      tab.classList.add("active");

      authType = tab.dataset.authType || "email";

      resetPhoneOtpFlow();
      emailInput.value = "";

      if (authType === "phone") {
        emailInput.type = "tel";
        emailInput.name = "phone";
        emailInput.autocomplete = "tel";
        emailInput.placeholder = "+971 5X XXX XXXX";
        emailInputLabel.textContent = "Enter Phone Number";
        emailInput.required = true;
        setMode(mode);
        return;
      }

      emailInput.type = "email";
      emailInput.name = "email";
      emailInput.autocomplete = "email";
      emailInput.placeholder = "Enter your email";
      emailInputLabel.textContent = "Email";
      emailInput.required = true;

      setMode(mode);
    });
  });


  phoneChangeNumber.addEventListener("click", function () {
    resetPhoneOtpFlow();
    emailInput.focus();
    setMode(mode);
  });

  phoneSmsFallback.addEventListener("click", async function () {
    if (!activePhone || phoneSmsFallback.disabled) return;

    phoneSmsFallback.disabled = true;
    setMessage("Requesting an SMS code...");

    try {
      const { error } = await rexSupabase.auth.resend({
        type: "sms",
        phone: activePhone
      });

      if (error) throw error;

      setMessage("The code was sent by SMS. Enter the latest code.", "account-message-success");
      startPhoneSmsCountdown(30, true);
    } catch (error) {
      console.error("[R-EX] Could not resend phone OTP by SMS:", error);
      phoneSmsFallback.disabled = false;
      setMessage(
        error.message || "Could not send the SMS code. Please try again.",
        "account-message-error"
      );
    }
  });


  /* ==========================================
     SIGN IN / CREATE ACCOUNT SWITCH
  ========================================== */

  toggleAuth.addEventListener(
    "click",
    function (event) {
      event.preventDefault();

      setMode(
        mode === "signin"
          ? "signup"
          : "signin"
      );
    }
  );


  /* ==========================================
     FORGOT PASSWORD
  ========================================== */

  forgotPassword.addEventListener(
    "click",
    async function (event) {
      event.preventDefault();

      const email = emailInput.value.trim();

      if (!email) {
        setMessage(
          "Enter your email first.",
          "account-message-error"
        );

        emailInput.focus();
        return;
      }

      forgotPassword.style.pointerEvents = "none";

      setMessage("Sending password reset email...");

      const { error } =
        await rexSupabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              "https://www.r-exllc.com/home2?reset-password=1"
          }
        );

      forgotPassword.style.pointerEvents = "";

      if (error) {
        setMessage(
          error.message,
          "account-message-error"
        );

        return;
      }

      setMessage(
        "Password reset email sent. Check your inbox.",
        "account-message-success"
      );
    }
  );


  /* ==========================================
     SIGN IN / SIGN UP
  ========================================== */

  form.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      if (authType === "phone") {
        if (phoneOtpStage === "phone") {
          const phone = normalizeUaeMobile(emailInput.value);

          if (!phone) {
            setMessage(
              "Enter a valid UAE mobile number, for example +971501234567.",
              "account-message-error"
            );
            emailInput.focus();
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = "SENDING CODE...";
          setMessage("Sending your verification code on WhatsApp...");

          try {
            const { error } = await rexSupabase.auth.signInWithOtp({
              phone,
              options: {
                channel: "whatsapp",
                shouldCreateUser: mode === "signup"
              }
            });

            if (error) throw error;

            activePhone = phone;
            phoneOtpStage = "otp";
            emailInput.value = phone;
            emailInput.readOnly = true;
            phoneOtpField.style.display = "flex";
            phoneOtpInput.required = true;
            phoneChangeNumber.style.display = "block";
            toggleAuth.style.display = "none";
            submitBtn.disabled = false;
            submitBtn.textContent = "VERIFY CODE";
            setMessage(`We sent a code to ${phone} on WhatsApp. You can request SMS after 30 seconds.`, "account-message-success");
            startPhoneSmsCountdown(30, false);
          } catch (error) {
            console.error("[R-EX] WhatsApp phone sign-in failed:", error);
            submitBtn.disabled = false;
            submitBtn.textContent = "SEND WHATSAPP CODE";
            setMessage(
              error.message || "Could not send the WhatsApp code. Please try again.",
              "account-message-error"
            );
          }

          return;
        }

        const token = phoneOtpInput.value.trim();
        if (!/^\d{6}$/.test(token)) {
          setMessage("Enter the 6-digit verification code.", "account-message-error");
          phoneOtpInput.focus();
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "VERIFYING...";

        try {
          const { data, error } = await rexSupabase.auth.verifyOtp({
            phone: activePhone,
            token,
            type: "sms"
          });

          if (error) throw error;

          clearPhoneSmsTimer();
          currentUser = data?.user || null;
          submitBtn.disabled = false;
          await loadAccountAvatar(currentUser);
          showUserPanel(currentUser);
        } catch (error) {
          console.error("[R-EX] Phone OTP verification failed:", error);
          submitBtn.disabled = false;
          submitBtn.textContent = "VERIFY CODE";
          setMessage(
            error.message || "The code is invalid or expired. Request a new code and try again.",
            "account-message-error"
          );
        }

        return;
      }

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword =
        confirmPasswordInput.value;

      if (!email || !password) {
        setMessage(
          "Enter your email and password.",
          "account-message-error"
        );

        return;
      }

      if (password.length < 6) {
        setMessage(
          "Password must contain at least 6 characters.",
          "account-message-error"
        );

        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "PLEASE WAIT...";

      let response;

      if (mode === "signup") {
        if (password !== confirmPassword) {
          submitBtn.disabled = false;
          submitBtn.textContent = "CREATE ACCOUNT";

          setMessage(
            "Passwords do not match.",
            "account-message-error"
          );

          return;
        }

        response = await rexSupabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              "https://www.r-exllc.com/home2"
          }
        });
      } else {
        response =
          await rexSupabase.auth.signInWithPassword({
            email,
            password
          });
      }

      submitBtn.disabled = false;

      submitBtn.textContent =
        mode === "signup"
          ? "CREATE ACCOUNT"
          : "SIGN IN";

      if (response.error) {
        setMessage(
          response.error.message,
          "account-message-error"
        );

        return;
      }

      if (
        mode === "signin" &&
        response.data?.user
      ) {
        currentUser = response.data.user;

await loadAccountAvatar(
  response.data.user
);

showUserPanel(
  response.data.user
);
        return;
      }

      setMessage(
        "Check your email to confirm your account.",
        "account-message-success"
      );
    }
  );


  /* ==========================================
     UPDATE PASSWORD
  ========================================== */

  resetPasswordForm.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      const newPassword =
        newPasswordInput.value;

      const confirmNewPassword =
        confirmNewPasswordInput.value;

      if (!newPassword || !confirmNewPassword) {
        setMessage(
          "Enter and confirm your new password.",
          "account-message-error"
        );

        return;
      }

      if (newPassword.length < 6) {
        setMessage(
          "Password must contain at least 6 characters.",
          "account-message-error"
        );

        return;
      }

      if (newPassword !== confirmNewPassword) {
        setMessage(
          "Passwords do not match.",
          "account-message-error"
        );

        return;
      }

      const updateButton =
        resetPasswordForm.querySelector(
          'button[type="submit"]'
        );

      if (updateButton) {
        updateButton.disabled = true;
        updateButton.textContent = "UPDATING...";
      }

      const { data, error } =
        await rexSupabase.auth.updateUser({
          password: newPassword
        });

      if (updateButton) {
        updateButton.disabled = false;
        updateButton.textContent = "UPDATE PASSWORD";
      }

      if (error) {
        setMessage(
          error.message,
          "account-message-error"
        );

        return;
      }

      currentUser =
        data?.user ||
        currentUser;

      setMessage(
        "Password updated successfully.",
        "account-message-success"
      );

      /*
       * إزالة ?reset-password=1 من رابط الصفحة.
       */
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      setTimeout(function () {
        showUserPanel(
          currentUser || {
            email: "R-EX Member"
          }
        );
      }, 1000);
    }
  );


  /* ==========================================
     LOGOUT
  ========================================== */

  logoutBtn.addEventListener(
    "click",
    async function () {
      const { error } =
        await rexSupabase.auth.signOut();

      if (error) {
        setMessage(
          error.message,
          "account-message-error"
        );

        return;
      }

      currentUser = null;
      updateAccountButtonAvatar(null);
      showAuthForm();
      setMode("signin");

      setMessage(
        "Logged out successfully.",
        "account-message-success"
      );
    }
  );


  /* ==========================================
     SUPABASE AUTH EVENTS
  ========================================== */

  rexSupabase.auth.onAuthStateChange(
    function (event, session) {
      if (event === "PASSWORD_RECOVERY") {
        currentUser =
          session?.user || null;

        openAccount();
        showResetPasswordForm();

        return;
      }

      if (session?.user) {
        currentUser = session.user;
      } else {
        currentUser = null;
      }
    }
  );

window.addEventListener(
  "rex:profile-updated",
  function (event) {
    updateAccountButtonAvatar(
      event.detail?.profile
        ?.avatar_url || null
    );
  }
);


  /* ==========================================
     KEYBOARD
  ========================================== */

  document.addEventListener(
    "keydown",
    function (event) {
      if (!modal.classList.contains("active")) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeAccount();
        return;
      }

      if (event.key === "Tab") {
        trapAccountTab(event);
      }
    }
  );


  /* ==========================================
     INITIALIZE
  ========================================== */

  setMode("signin");
  checkSession();
}

