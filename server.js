// 天勤零件维修记录表 - 后端服务
// 使用 Node.js 内置模块，无需 npm install
// 启动：node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const HTML_FILE = path.join(__dirname, 'index.html');

// ===== 工具函数 =====

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const sample = [
        { id:1, partName:'X射线管', repairPerson:'张工', machineModel:'Philips Brilliance 64排CT', faultDesc:'球管过热频繁报错，无法正常扫描', repairContent:'更换球管冷却油，清洁散热模块，重新校准温度传感器', difficulty:'已攻克', diffRemark:'冷却系统老化导致，常规维护可预防', result:'已修复', remark:'建议缩短保养周期至6个月', createdAt:'2025-06-15T09:30:00.000Z' },
        { id:2, partName:'探测器模块', repairPerson:'李工', machineModel:'Canon Aquilion One', faultDesc:'图像出现固定位置伪影，部分通道数据异常', repairContent:'校准探测器通道，更换2个坏通道模块，执行DAS校准', difficulty:'有进展', diffRemark:'部分通道仍存在偏移，需联系原厂获取校准参数', result:'部分修复', remark:'等待原厂技术支持', createdAt:'2025-06-20T14:15:00.000Z' },
        { id:3, partName:'高压发生器', repairPerson:'王工', machineModel:'Philips Brilliance 64排CT', faultDesc:'kV输出不稳定，扫描中途掉高压', repairContent:'检测高压控制板，发现多颗电容鼓包老化，初步更换电容', difficulty:'难度大', diffRemark:'高压控制板已停产，替代方案评估中', result:'待跟进', remark:'需评估第三方兼容件', createdAt:'2025-06-25T10:00:00.000Z' },
        { id:4, partName:'超声探头', repairPerson:'赵工', machineModel:'Canon Aplio 500', faultDesc:'凸阵探头部分阵元无信号，图像出现暗带', repairContent:'更换损坏晶片，重新匹配声学参数，执行探头性能测试', difficulty:'已攻克', diffRemark:'阵元断裂由碰撞导致，非自然老化', result:'已修复', remark:'已更新探头存放规范', createdAt:'2025-06-28T16:45:00.000Z' },
        { id:5, partName:'旋转滑环', repairPerson:'张工', machineModel:'Philips Brilliance 64排CT', faultDesc:'滑环碳刷磨损严重，扫描时偶发通讯中断', repairContent:'更换碳刷组件，清洁滑环轨道，调整碳刷弹簧压力', difficulty:'有进展', diffRemark:'碳刷已更换，轨道有轻微划痕需持续观察', result:'已修复', remark:'下次保养重点检查滑环轨道', createdAt:'2025-07-01T08:20:00.000Z' }
      ];
      fs.writeFileSync(DATA_FILE, JSON.stringify({ nextId: 6, records: sample }, null, 2), 'utf8');
      return { nextId: 6, records: sample };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('读取数据失败:', e.message);
    return { nextId: 1, records: [] };
  }
}

function saveData(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8'); return true; }
  catch (e) { console.error('写入数据失败:', e.message); return false; }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function send(res, status, data, type) {
  const body = type ? data : JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function htmlSend(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// ===== 路由 =====

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  // GET /api/records
  if (pathname === '/api/records' && method === 'GET') {
    return send(res, 200, { success: true, ...loadData() });
  }

  // POST /api/records
  if (pathname === '/api/records' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const data = loadData();
      const now = new Date().toISOString();
      const rec = { ...body, id: data.nextId, createdAt: now };
      data.records.push(rec);
      data.nextId++;
      saveData(data);
      return send(res, 201, { success: true, record: rec });
    } catch (e) { return send(res, 400, { success: false, error: e.message }); }
  }

  // PUT /api/records/:id
  if (pathname.match(/^\/api\/records\/\d+$/) && method === 'PUT') {
    const id = parseInt(pathname.split('/')[3]);
    if (isNaN(id)) return send(res, 400, { success: false, error: '无效ID' });
    try {
      const body = await parseBody(req);
      const data = loadData();
      const idx = data.records.findIndex(r => r.id === id);
      if (idx < 0) return send(res, 404, { success: false, error: '记录不存在' });
      const orig = data.records[idx];
      const changed =
        orig.partName !== body.partName ||
        orig.repairPerson !== body.repairPerson ||
        orig.machineModel !== body.machineModel ||
        (orig.faultDesc || '') !== (body.faultDesc || '') ||
        (orig.repairContent || '') !== (body.repairContent || '') ||
        orig.difficulty !== body.difficulty ||
        (orig.diffRemark || '') !== (body.diffRemark || '') ||
        orig.result !== body.result ||
        (orig.remark || '') !== (body.remark || '');
      if (!changed) return send(res, 200, { success: false, message: '内容未修改' });
      data.records[idx] = { ...orig, ...body, id, createdAt: new Date().toISOString() };
      saveData(data);
      return send(res, 200, { success: true, record: data.records[idx] });
    } catch (e) { return send(res, 400, { success: false, error: e.message }); }
  }

  // DELETE /api/records/:id
  if (pathname.match(/^\/api\/records\/\d+$/) && method === 'DELETE') {
    const id = parseInt(pathname.split('/')[3]);
    if (isNaN(id)) return send(res, 400, { success: false, error: '无效ID' });
    const data = loadData();
    const idx = data.records.findIndex(r => r.id === id);
    if (idx < 0) return send(res, 404, { success: false, error: '记录不存在' });
    data.records.splice(idx, 1);
    saveData(data);
    return send(res, 200, { success: true });
  }

  // DELETE /api/records (清空)
  if (pathname === '/api/records' && method === 'DELETE') {
    saveData({ nextId: 1, records: [] });
    return send(res, 200, { success: true });
  }

  // POST /api/records/bulk (批量导入)
  if (pathname === '/api/records/bulk' && method === 'POST') {
    try {
      const body = await parseBody(req);
      if (!Array.isArray(body.records)) return send(res, 400, { success: false, error: 'records须为数组' });
      const data = loadData();
      let maxId = data.nextId;
      const newRecs = body.records.map(r => {
        if (r.id && r.id >= maxId) maxId = r.id + 1;
        return { ...r, id: r.id || maxId++ };
      });
      data.records = newRecs;
      data.nextId = maxId;
      saveData(data);
      return send(res, 200, { success: true, count: newRecs.length });
    } catch (e) { return send(res, 400, { success: false, error: e.message }); }
  }

  // GET / → 返回HTML
  if (pathname === '/' && method === 'GET') {
    if (!fs.existsSync(HTML_FILE)) return send(res, 404, { success: false, error: 'HTML文件不存在' });
    return htmlSend(res, fs.readFileSync(HTML_FILE, 'utf8'));
  }

  send(res, 404, { success: false, error: '接口不存在' });
});

server.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  let ip = 'localhost';
  for (const n in ifaces) for (const i of ifaces[n]) if (i.family === 'IPv4' && !i.internal) ip = i.address;
  console.log('==================================================');
  console.log('  天勤零件维修记录表 - 服务已启动');
  console.log('  本地：http://localhost:' + PORT);
  console.log('  局域网：http://' + ip + ':' + PORT);
  console.log('  按 Ctrl+C 停止服务');
  console.log('==================================================');
});
