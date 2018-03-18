#!/usr/bin/env node

const OSS = require('ali-oss').Wrapper;
const VER = require('./package.json').version;
const program = require('commander');
const fs = require('fs-extra');
const crypto = require('crypto');
const getStream = require('get-stream');
const path = require('path');
const process = require('process');
const _ = require('lodash');
const octokit = require('@octokit/rest')();
const externalEditor = require('external-editor')

const GITHUB_USER = 'mm-product2013';
const GITHUB_TOKEN = 'd00fa35cac85e801f17a704b6f0c3dcc42f68cff';

octokit.authenticate({
  type: 'token',
  token: GITHUB_TOKEN,
  // type: 'basic',
  // username: 'mm-product2013',
  // password: 'mm20131010'
});

// console.log('即将发布到:', GITHUB_REPOS);

// (async () => {
//   try {
//     // 获取所有仓库列表
//     let result = await octokit.repos.getAll({});
//     let reposList = _.map(result.data, o => o.name);
//     console.log('github repos list', reposList);

//     // 检测是否在仓库列表
//     _.indexOf

//     //     var data = externalEditor.edit('\n\n# Please write your text above');
//     // console.log('---', data);


//     result = await octokit.repos.getContent({ owner: GITHUB_USER, repo: GITHUB_REPOS, path: '/' });
//     console.log('github getContent', _.map(result.data, (o) => _.pick(o, ['path', 'name'])));

//   } catch (e) {
//     console.error('error:', e);
//   }

// })();
// console.log('exit');
// return;
// MShow 软件包发布工具，发布版本说明到aliyun云
// 发布文件到github指定项目的release中

console.log('--- mshow-tools-release-aliyun-oss ver:' + VER + ' ---');

program
  .version(VER)
  .option('-r, --repos <value>', '要发布的仓库名')
  .option('-t, --type <value>', '发布分类: apk, service, ...')
  .option('-p, --package <value>', '发布的软件包名')
  .option('-v, --ver   <value>', '要发布的版本号')
  .option('-f, --file <value>', '发布的文件名')
  .parse(process.argv);

if (!(program.repos, program.ver && program.type && program.name && program.file)) {
  program.outputHelp();
  return;
}
console.log('即将发布到:', program.repos);

(async () => {
  try {
    // 获取所有仓库列表
    let result = await octokit.repos.getAll({});
    console.log('github repos list', _.map(result.data, o => o.name));

    // 检测指定仓库是否已经存在
    if (!_.find(result.data, { name: program.repos })) {
      console.error('无效的github仓库名:' + program.repos);
      return;
    }
    // 上传文件

    // 读取上传文件的内容
    const fileBuffer = fs.readFileSync(program.file);
    if (!fileBuffer) {
      console.error('文件读取失败:', program.file);
      return;
    }
    const hash = crypto.createHash('sha1');
    hash.update(fileBuffer);
    const fileSha = hash.digest('hex');
    console.log('准备发布文件:', program.file, 'size:', fileBuffer.length, 'hash:', fileSha);

    const uploadPath = program.type + '/' + program.package + '/' + path.parse(program.file).base;
    console.log('uploadPath:', uploadPath);

    result = await octokit.repos.updateFile({
      owner: GITHUB_USER,
      repo: program.repos,
      path: uploadPath,
      message: '发布版本1:' + uploadPath + ',ver:' + program.ver,
      content: fileBuffer.toString('base64'),
      sha: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'
    })



    console.log('---!', result.data);
    // 检测是否在仓库列表


    //     var data = externalEditor.edit('\n\n# Please write your text above');
    // console.log('---', data);


    // result = await octokit.repos.getContent({ owner: GITHUB_USER, repo: program.repos, path: '/' });
    // console.log('github getContent', _.map(result.data, (o) => _.pick(o, ['path', 'name'])));
    // console.log('github getContent', result.data);

  } catch (e) {
    console.error('error:', e);
  }

})();


return;





const client = new OSS({
  accessKeyId: 'LTAIjG3BtnepjDv3',
  accessKeySecret: 'wka7IYNNy3MO9YEiYQyXFrFuv2JaiO',
  bucket: 'mshow-upgrade',
  region: 'oss-cn-beijing'
});

(async () => {
  let result = null;
  try {
    console.log('=== connect ali OSS ===');
    // 读取当前版本
    try {
      result = await client.get('/version.json');
    } catch (e) {
      console.log('NO version.json,create new');
    }
    let versionJson = {};
    if (result) {
      if (result.res.status === 200) {
        // 读取当前所有包版本信息
        versionJson = JSON.parse(result.content);
      } else {
        console.error('parse version.json fail:', result);
      }
    }
    // console.log('=== get version.json OK ===\n', versionJson);

    // 读取文件信息
    if (!fs.existsSync(program.file)) {
      console.error('File Not Existed!', program.file);
      return;
    }
    console.log('--> load file:', program.file);

    const fileSize = fs.statSync(program.file).size;
    console.log('fileSize:', fileSize);

    // 计算sha1
    const hash = crypto.createHash('sha1');
    const fileSha = await getStream(fs.createReadStream(program.file).pipe(hash), { encoding: 'buffer' });
    console.log('fileSha:', fileSha.toString('hex'));
    // 更新包，上传到服务器
    // 获取现有包信息
    result = await client.list({ prefix: 'download/' + program.package });
    // console.log('----', result);
    if (result.res.status != 200) {
      console.log('list aliyun package Error:', result);
      process.exit(1);
    }
    if (result.objects) {
      // 删除已有包
      for (let obj of result.objects) {
        var result1 = await client.delete(obj.name);;
        console.log('delete existed file:', obj.name, result1.res.status);
      }
    }
    // 上传新包
    const name = path.parse(program.file).base;
    result = await client.put('download/' + program.package + '/' + name, program.file);
    if (result.res.status !== 200) {
      console.log('--> upload file to aliyun Fail:', result.res);
      process.exit(1);
    }
    console.log('--> upload file to aliyun OK:', result.url);
    // 更新版本信息
    _.set(versionJson, [program.class, program.package], {
      version: program.release,
      url: result.url,
      sha: fileSha.toString('hex'),
      size: fileSize,
    })

    // console.log('--> new version Json:', versionJson);
    // 上传版本文件
    result = await client.put('version.json', new Buffer(JSON.stringify(versionJson)));
    if (result.res.status !== 200) {
      console.log('--> upload version.json  to aliyun Fail:', result.res);
      process.exit(1);
    }
    console.log('--> upload version.json to aliyun OK:', result.url);

  } catch (e) {
    console.error(e);
  }
  console.log('RELEASE SUCCESSED!', program.package, program.release);

})()

