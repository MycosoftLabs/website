const fs = require('fs');
const file = 'components/widgets/humans-machines-panel.tsx';
let content = fs.readFileSync(file, 'utf8');

// Order matters to avoid cascaded replacement!
content = content.replaceAll("text-[10px]", "text-base");
content = content.replaceAll("text-[9px]", "text-sm");
content = content.replaceAll("text-[8px]", "text-xs");
content = content.replaceAll("text-[7px]", "text-[10px]");

content = content.replaceAll("text-lg ", "text-3xl ");
content = content.replaceAll("text-lg\"", "text-3xl\"");

content = content.replaceAll("h-4 w-4", "h-6 w-6");
content = content.replaceAll("h-3 w-3", "h-5 w-5");
content = content.replaceAll("h-2.5 w-2.5", "h-4 w-4");

content = content.replaceAll("p-2 ", "p-4 ");
content = content.replaceAll("p-1 ", "p-3 ");

// Fix one overly large padding if it got doubled
content = content.replaceAll("p-4 rounded-md", "p-4 rounded-xl");

fs.writeFileSync(file, content);
console.log("Fixed!");
