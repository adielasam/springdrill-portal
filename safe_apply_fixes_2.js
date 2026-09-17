const fs = require('fs');

let html = fs.readFileSync('public/admin_dashboard.html', 'utf8');

// 1. Fix the "Classes" stat card bug
const oldChartLogic = `const labels = Object.keys(classCounts);`;
const newChartLogic = `const labels = Object.keys(classCounts);
                document.getElementById('statClasses').innerText = labels.length;`;
html = html.replace(oldChartLogic, newChartLogic);

const brokenStatClassesCode = `document.getElementById('statClasses').innerText = classCount || 0;`;
html = html.replace(brokenStatClassesCode, `// statClasses is now set by renderClassChart()`);

// 2. Fix Chart Colors to use Gradients matching the palettes
const chartJSColorsOld = `const bgColors = ['#2563eb', '#0d9488', '#f43f5e', '#7c3aed', '#059669', '#f59e0b', '#3b82f6', '#14b8a6', '#e11d48', '#8b5cf6', '#10b981', '#d97706'];`;

const chartJSColorsNew = `
                const ctx = document.getElementById('classDistributionChart').getContext('2d');
                function makeGrad(c1, c2) {
                    const g = ctx.createLinearGradient(0, 0, 0, 300);
                    g.addColorStop(0, c1);
                    g.addColorStop(1, c2);
                    return g;
                }
                const baseBgColors = [
                    makeGrad('#3b82f6', '#2563eb'), // Blue
                    makeGrad('#14b8a6', '#0d9488'), // Teal
                    makeGrad('#f43f5e', '#e11d48'), // Coral
                    makeGrad('#8b5cf6', '#7c3aed'), // Violet
                    makeGrad('#10b981', '#059669'), // Green
                    makeGrad('#f59e0b', '#d97706')  // Amber
                ];
                // Loop the colors if more than 6 classes
                const finalBgColors = [];
                for(let i = 0; i < labels.length; i++) {
                    finalBgColors.push(baseBgColors[i % 6]);
                }
`;
html = html.replace(chartJSColorsOld, chartJSColorsNew);

// Remove the old `const ctx = document.getElementById('classDistributionChart').getContext('2d');` since we moved it up
html = html.replace(/const ctx = document\.getElementById\('classDistributionChart'\)\.getContext\('2d'\);\s*new Chart\(ctx, {/, 'new Chart(ctx, {');

// Update chart datasets config
html = html.replace(/backgroundColor: bgColors\.slice\(0, labels\.length\),/, 'backgroundColor: finalBgColors,');

fs.writeFileSync('public/admin_dashboard.html', html);
console.log('Fixed classes count and chart gradients. Icons kept as working CSS versions.');
