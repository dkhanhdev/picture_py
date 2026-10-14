/**
 * Sinh ảnh mẫu thử nghiệm trực tiếp bằng Canvas để kiểm thử tức thì
 */
export function generateSampleImage(type: 'prism' | 'sunset' | 'palette'): File {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;

  if (type === 'prism') {
    // 1. Phổ lăng kính tán sắc RGB
    const grad = ctx.createLinearGradient(0, 0, 640, 0);
    grad.addColorStop(0, '#ff0000');
    grad.addColorStop(0.2, '#ffff00');
    grad.addColorStop(0.4, '#00ff00');
    grad.addColorStop(0.6, '#00ffff');
    grad.addColorStop(0.8, '#0000ff');
    grad.addColorStop(1, '#ff00ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 400);

    // Thêm các hình học đối lập để kiểm tra tách kênh
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(320, 200, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.fillRect(280, 160, 80, 80);
  } else if (type === 'sunset') {
    // 2. Hoàng hôn Cyberpunk neon (Đỏ cam ấm phía trên, Xanh tím phía dưới)
    const sky = ctx.createLinearGradient(0, 0, 0, 300);
    sky.addColorStop(0, '#ff3b30');
    sky.addColorStop(0.5, '#ff9500');
    sky.addColorStop(1, '#5856d6');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 640, 300);

    // Biển phản chiếu xanh lam
    const sea = ctx.createLinearGradient(0, 300, 0, 400);
    sea.addColorStop(0, '#007aff');
    sea.addColorStop(1, '#051937');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 300, 640, 100);

    // Mặt trời vàng rực
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(320, 260, 50, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 3. Bảng kiểm màu chuẩn RGB tách biệt (Color Bars)
    const barWidth = 640 / 6;
    const colors = [
      '#ff0000', // Red thuần
      '#00ff00', // Green thuần
      '#0000ff', // Blue thuần
      '#ffff00', // Yellow (R+G)
      '#00ffff', // Cyan (G+B)
      '#ff00ff', // Magenta (R+B)
    ];

    colors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(i * barWidth, 0, barWidth, 300);
    });

    // Băng thang độ xám (Grayscale ramp) phía dưới
    const grayRamp = ctx.createLinearGradient(0, 300, 640, 300);
    grayRamp.addColorStop(0, '#000000');
    grayRamp.addColorStop(1, '#ffffff');
    ctx.fillStyle = grayRamp;
    ctx.fillRect(0, 300, 640, 100);
  }

  // Chuyển canvas thành Blob và File
  const dataUrl = canvas.toDataURL('image/png');
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  const filename = `chromatica_sample_${type}.png`;
  return new File([u8arr], filename, { type: 'image/png' });
}
