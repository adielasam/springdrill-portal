const fs = require('fs');
let content = fs.readFileSync('public/teacher_list.html', 'utf8');

const oldPhotoUpload = `<div class="form-section-title"><i data-lucide="image"></i> Profile Photo</div>
                    <div class="photo-upload" onclick="alert('Photo upload integration requires Supabase Storage setup.')">
                        <i data-lucide="upload-cloud" style="width: 32px; height: 32px; color: var(--brand-500); margin-bottom: 8px;"></i>
                        <div style="font-weight: 600; font-size: 14px;">Click to select image</div>
                        <div style="font-size: 12px; color: var(--text-muted);">PNG, JPG up to 2MB</div>
                    </div>`;

const newPhotoUpload = `<div class="form-section-title"><i data-lucide="camera"></i> Profile Photo (Passport)</div>
                    <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; display: inline-flex; flex-direction: column; align-items: center; gap: 12px; background: var(--gray-50); width: 200px;">
                        <div id="passportPreview" style="width: 140px; height: 160px; background: #e5e7eb; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #d1d5db;">
                            <i data-lucide="user" style="width: 64px; height: 64px; color: #9ca3af;"></i>
                        </div>
                        <input type="file" id="passportInput" accept="image/*" style="display: none;">
                        <button type="button" class="btn btn-sm btn-light border fw-bold" onclick="document.getElementById('passportInput').click()" style="width: 100%;">Select image</button>
                    </div>`;

content = content.replace(oldPhotoUpload, newPhotoUpload);

const oldEditModalLogic = `document.getElementById('editAddress').value = currentTeacher.present_address || '';`;
const newEditModalLogic = `document.getElementById('editAddress').value = currentTeacher.present_address || '';
            
            const previewBox = document.getElementById('passportPreview');
            if(currentTeacher.avatar_url) {
                previewBox.innerHTML = \`<img src="\${currentTeacher.avatar_url}" style="width:100%; height:100%; object-fit:cover;">\`;
            } else {
                previewBox.innerHTML = \`<i data-lucide="user" style="width: 64px; height: 64px; color: #9ca3af;"></i>\`;
                lucide.createIcons();
            }`;

content = content.replace(oldEditModalLogic, newEditModalLogic);

const jsEndOfInit = `document.addEventListener('DOMContentLoaded', init);`;
const fileInputLogic = `
        document.getElementById('passportInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('passportPreview').innerHTML = \`<img src="\${e.target.result}" style="width:100%; height:100%; object-fit:cover;" id="passportImgData">\`;
                }
                reader.readAsDataURL(file);
            }
        });
        
        document.addEventListener('DOMContentLoaded', init);`;

content = content.replace(jsEndOfInit, fileInputLogic);

// Update saving logic to save the base64 string if selected
const oldSaveLogic = `present_address: document.getElementById('editAddress').value || null
            };`;
const newSaveLogic = `present_address: document.getElementById('editAddress').value || null
            };
            
            const imgData = document.getElementById('passportImgData');
            if(imgData) {
                payload.avatar_url = imgData.src;
            }`;
content = content.replace(oldSaveLogic, newSaveLogic);

fs.writeFileSync('public/teacher_list.html', content);
console.log('Successfully updated photo upload UI');
