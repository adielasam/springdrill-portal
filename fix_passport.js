const fs = require('fs');
let content = fs.readFileSync('public/teacher_list.html', 'utf8');

// 1. Make the preview box clickable
const oldPreview = `<div id="passportPreview" style="width: 140px; height: 160px; background: #e5e7eb; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #d1d5db;">`;
const newPreview = `<div id="passportPreview" onclick="document.getElementById('passportInput').click()" style="width: 140px; height: 160px; background: #e5e7eb; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #d1d5db; cursor: pointer;">`;
content = content.replace(oldPreview, newPreview);

// 2. Add avatar_url to the fallback DB save
const oldFallback = `// Fallback to only updating known columns
                    await supabase.from('users').update({
                        name: payload.name,
                        gender: payload.gender,
                        email: payload.email
                    }).eq('id', currentTeacher.id);`;

const newFallback = `// Fallback to only updating known columns
                    const fallbackPayload = {
                        name: payload.name,
                        gender: payload.gender,
                        email: payload.email
                    };
                    if (payload.avatar_url) fallbackPayload.avatar_url = payload.avatar_url;
                    await supabase.from('users').update(fallbackPayload).eq('id', currentTeacher.id);`;
content = content.replace(oldFallback, newFallback);

// 3. Update viewAvatar logic to show the image if available
const oldViewAvatar = `// Populate View
            const initials = currentTeacher.name ? currentTeacher.name.substring(0, 2).toUpperCase() : 'T';
            document.getElementById('viewAvatar').innerText = initials;`;

const newViewAvatar = `// Populate View
            const initials = currentTeacher.name ? currentTeacher.name.substring(0, 2).toUpperCase() : 'T';
            if(currentTeacher.avatar_url) {
                document.getElementById('viewAvatar').innerHTML = \`<img src="\${currentTeacher.avatar_url}" style="width:100%; height:100%; object-fit:cover;">\`;
            } else {
                document.getElementById('viewAvatar').innerHTML = initials;
            }`;
content = content.replace(oldViewAvatar, newViewAvatar);

// 4. Update the small avatar in the table row
const oldTableRow = `const avatarInitials = t.name ? t.name.substring(0, 2).toUpperCase() : 'T';`;
const newTableRow = `const avatarInitials = t.name ? t.name.substring(0, 2).toUpperCase() : 'T';
                const avatarHtml = t.avatar_url ? \`<img src="\${t.avatar_url}" style="width:100%; height:100%; object-fit:cover;">\` : avatarInitials;`;
content = content.replace(oldTableRow, newTableRow);
content = content.replace(`<div class="user-avatar">\${avatarInitials}</div>`, `<div class="user-avatar">\${avatarHtml}</div>`);

fs.writeFileSync('public/teacher_list.html', content);
console.log('Successfully fixed passport preview clicking and saving logic');
