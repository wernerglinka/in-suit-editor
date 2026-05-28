/**
 * Thin wrapper around Netlify Identity widget. The widget script is
 * loaded from CDN in lib/layouts/admin.njk. This module owns the UI
 * surface (sign-in/out buttons, signed-in state display) and exposes
 * helpers the publish flow uses to attach the user's JWT.
 */

/**
 * @returns {object|null} Current Netlify Identity user, or null if signed out.
 */
export function currentUser() {
  return (window.netlifyIdentity && window.netlifyIdentity.currentUser()) || null;
}

/**
 * @returns {string|null} Bearer token for the signed-in user.
 */
export function accessToken() {
  const user = currentUser();
  return user && user.token ? user.token.access_token : null;
}

/**
 * @returns {string[]} Roles from app_metadata.roles, or empty array.
 */
export function userRoles() {
  const user = currentUser();
  return (user && user.app_metadata && user.app_metadata.roles) || [];
}

/**
 * Wire the Netlify Identity widget into the admin's settings panel.
 * Updates the signed-in/out labels, toggles publish buttons by role.
 *
 * @param {Object} ui - UI element references.
 */
export function initIdentity(ui) {
  const widget = window.netlifyIdentity;
  if (!widget) {
    console.warn('Netlify Identity widget not loaded');
    return;
  }

  const render = () => {
    const user = widget.currentUser();
    const isAdmin = userRoles().includes('admin');

    if (user) {
      ui.identitySignedOut.style.display = 'none';
      ui.identitySignedIn.style.display = '';
      ui.identityUserEmail.textContent = user.email || '';
      ui.identityUserRole.textContent = isAdmin ? 'admin' : 'editor';
      ui.identitySigninBtn.style.display = 'none';
      ui.identitySignoutBtn.style.display = '';

      ui.publishPrBtn.disabled = false;
      ui.publishPrBtn.title = 'Open a pull request for review';
      ui.publishDirectBtn.style.display = isAdmin ? '' : 'none';
      ui.publishDirectBtn.disabled = !isAdmin;
      ui.publishDirectBtn.title = isAdmin
        ? 'Commit straight to main, skipping PR'
        : 'Admins only';
    } else {
      ui.identitySignedOut.style.display = '';
      ui.identitySignedIn.style.display = 'none';
      ui.identitySigninBtn.style.display = '';
      ui.identitySignoutBtn.style.display = 'none';

      ui.publishPrBtn.disabled = true;
      ui.publishPrBtn.title = 'Sign in to publish';
      ui.publishDirectBtn.style.display = 'none';
      ui.publishDirectBtn.disabled = true;
    }
  };

  widget.on('init', render);
  widget.on('login', () => {
    widget.close();
    render();
  });
  widget.on('logout', render);

  ui.identitySigninBtn.onclick = () => widget.open();
  ui.identitySignoutBtn.onclick = () => widget.logout();

  widget.init();
}
