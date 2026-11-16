// sd-confirm.js — shared in-page confirmation modal.
// Replaces native confirm() dialogs, which automated browsers silently
// dismiss (and which look inconsistent across devices).
//
// Usage:
//   const ok = await window.sdConfirm({
//     title: 'Submit exam?',            // optional, default 'Please confirm'
//     message: 'Are you sure?',         // required wording, shown as plain text
//     confirmLabel: 'Submit',           // optional, default 'Confirm'
//     cancelLabel: 'Cancel',            // optional, default 'Cancel'
//     danger: false                     // optional, red confirm button + Cancel focused
//   });
// Resolves true on Confirm, false on Cancel, overlay click, or Escape.
// No dependencies. Injects its own styles once, all .sd-confirm-* prefixed.
(function () {
    if (window.sdConfirm) return;

    var STYLE_ID = 'sd-confirm-style';

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent =
            '.sd-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;box-sizing:border-box}' +
            '.sd-confirm-card{background:#fff;border-radius:12px;max-width:420px;width:100%;padding:24px;box-shadow:0 12px 40px rgba(0,0,0,.25);box-sizing:border-box}' +
            '.sd-confirm-title{margin:0 0 10px;font-size:1.15rem;font-weight:700;color:#1a3c34}' +
            '.sd-confirm-message{margin:0 0 20px;font-size:.95rem;line-height:1.5;color:#333}' +
            '.sd-confirm-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}' +
            '.sd-confirm-btn{border:none;border-radius:8px;padding:10px 20px;font-size:.95rem;font-weight:700;cursor:pointer}' +
            '.sd-confirm-btn-confirm{background:#007a4d;color:#fff}' +
            '.sd-confirm-btn-confirm:hover{background:#00603d}' +
            '.sd-confirm-btn-confirm-danger{background:#dc3545;color:#fff}' +
            '.sd-confirm-btn-confirm-danger:hover{background:#bb2d3b}' +
            '.sd-confirm-btn-cancel{background:#fff;color:#444;border:1px solid #ccc}' +
            '.sd-confirm-btn-cancel:hover{background:#f1f1f1}';
        document.head.appendChild(style);
    }

    window.sdConfirm = function (options) {
        var opts = options || {};
        var title = opts.title || 'Please confirm';
        var message = opts.message || 'Are you sure?';
        var confirmLabel = opts.confirmLabel || 'Confirm';
        var cancelLabel = opts.cancelLabel || 'Cancel';
        var danger = !!opts.danger;

        ensureStyle();

        return new Promise(function (resolve) {
            var settled = false;

            var overlay = document.createElement('div');
            overlay.className = 'sd-confirm-overlay';
            overlay.innerHTML =
                '<div class="sd-confirm-card" role="dialog" aria-modal="true">' +
                    '<h3 class="sd-confirm-title"></h3>' +
                    '<p class="sd-confirm-message"></p>' +
                    '<div class="sd-confirm-actions">' +
                        '<button type="button" class="sd-confirm-btn sd-confirm-btn-cancel"></button>' +
                        '<button type="button" class="sd-confirm-btn sd-confirm-btn-confirm"></button>' +
                    '</div>' +
                '</div>';

            var card = overlay.firstElementChild;
            card.querySelector('.sd-confirm-title').textContent = title;
            card.querySelector('.sd-confirm-message').textContent = message;
            var cancelBtn = card.querySelector('.sd-confirm-btn-cancel');
            var confirmBtn = card.querySelector('.sd-confirm-btn-confirm');
            cancelBtn.textContent = cancelLabel;
            confirmBtn.textContent = confirmLabel;
            if (danger) confirmBtn.classList.add('sd-confirm-btn-confirm-danger');

            function done(value) {
                if (settled) return;
                settled = true;
                document.removeEventListener('keydown', onKeyDown, true);
                overlay.remove();
                resolve(value);
            }

            function onKeyDown(e) {
                if (e.key === 'Escape') { e.preventDefault(); done(false); }
            }

            confirmBtn.addEventListener('click', function () { done(true); });
            cancelBtn.addEventListener('click', function () { done(false); });
            overlay.addEventListener('click', function (e) { if (e.target === overlay) done(false); });
            document.addEventListener('keydown', onKeyDown, true);

            document.body.appendChild(overlay);
            (danger ? cancelBtn : confirmBtn).focus();
        });
    };
})();
