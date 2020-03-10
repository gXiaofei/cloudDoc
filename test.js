const QiniuManager = require('./src/utils/QiniuManager');
const accessKey = 'xLP-OIncpc7S0XMSbvPu5ml4sYmeyFo3YwKVXvQA';
const secretKey = 'L_8MXn-qnPybX-68v0zHA5iup2PuB8S0TvsrV6KP';
const path = require('path');
var localFile = "C:\\Users\\Mloong\\Desktop\\nam1.md";

var key='nam1.md';


const manager = new QiniuManager(accessKey, secretKey, 'cloudecode')
manager.uploadFile(key, localFile).then(data => {
    console.log(data);
})

// manager.generateDownloadLink(key).then(data => {
//     console.log(data);
//     return manager.generateDownloadLink(key)
// }).then(data => {
//     console.log(data);
// })

const downloadPath = path.join(__dirname, key)

// manager.downloadFile(key, downloadPath).then(data => {

// }).catch(err => {
//     console.log(err);
// })

// 文件下载
// var publicBucketDomain = 'http://q6tineh00.bkt.clouddn.com';
// // 公开空间访问链接
// var publicDownloadUrl = bucketManager.publicDownloadUrl(publicBucketDomain, key);
// console.log(publicDownloadUrl);


