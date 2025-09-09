const fs = require('fs');
const path = require('path');

// 创建PNG图标的脚本
// 由于我们需要将SVG转换为PNG，我们将创建不同尺寸的SVG文件，然后可以手动转换或使用在线工具

const iconSizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'public', 'icons');

// 读取原始SVG内容
const originalSvg = fs.readFileSync(path.join(iconsDir, 'icon.svg'), 'utf8');

// 为每个尺寸创建SVG文件
iconSizes.forEach(size => {
  // 修改SVG的width和height属性
  const modifiedSvg = originalSvg
    .replace(/width="\d+"/g, `width="${size}"`)
    .replace(/height="\d+"/g, `height="${size}"`)
    .replace(/viewBox="0 0 \d+ \d+"/g, `viewBox="0 0 ${size} ${size}"`);
  
  // 保存修改后的SVG文件
  const filename = `icon-${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), modifiedSvg);
  console.log(`Created ${filename}`);
});

console.log('SVG icons created successfully!');
console.log('Please convert these SVG files to PNG format using an online converter or image editing software:');
iconSizes.forEach(size => {
  console.log(`- icon-${size}.svg -> icon-${size}.png`);
});