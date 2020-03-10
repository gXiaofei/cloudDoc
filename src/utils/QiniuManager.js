const qiniu = require('qiniu');
const fs = require('fs');
const axios = require('axios');
class QiniuManager {
    constructor(accessKey, secretKey, bucket) {
        // 初始化值
        this.mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
        this.bucket = bucket;

        this.config = new qiniu.conf.Config();
        // 空间对应的机房
        this.config.zone = qiniu.zone.Zone_z0;

        this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
    }
    //上传文件
    uploadFile(key, locationFilePath) {
        const options = {
            scope: this.bucket + ':' + key
        };
        const putPolicy = new qiniu.rs.PutPolicy(options);
        const uploadToken = putPolicy.uploadToken(this.mac);
        const formUploader = new qiniu.form_up.FormUploader(this.config);
        const putExtra = new qiniu.form_up.PutExtra();

        return new Promise((resolve, reject) => {
            //文件上传
            formUploader.putFile(
                uploadToken,
                key,
                locationFilePath,
                putExtra,
                this._handleCallBack(resolve, reject)
            );
        });
    }
    // 删除文件
    deleteFile(key) {
        return new Promise((resolve, reject) => {
            this.bucketManager.delete(
                this.bucket,
                key,
                this._handleCallBack(resolve, reject)
            );
        });
    }
    // 获取下载的外链域名
    getBucketDomain() {
        const reqURL = `http://api.qiniu.com/v6/domain/list?tbl=${this.bucket}`;
        const digest = qiniu.util.generateAccessToken(this.mac, reqURL);
        return new Promise((resolve, reject) => {
            qiniu.rpc.postWithoutForm(
                reqURL,
                digest,
                this._handleCallBack(resolve, reject)
            );
        });
    }
    // 获取下载的地址
    generateDownloadLink(key) {
        const domainPromise = this.publicBucketDomain
            ? Promise.resolve([this.publicBucketDomain])
            : this.getBucketDomain();

        return domainPromise.then(data => {
            if(Array.isArray(data) && data.length){
                const pattern = /^https?/;
                this.publicBucketDomain = pattern.test(data[0]) ? data[0] : `http://${data[0]}`;
                return this.bucketManager.publicDownloadUrl(this.publicBucketDomain, key);
            }else{
                throw Error('域名未找到，请查看存储空间是否过期');
            }
        })
    }

    downloadFile(key, downloadFile) {
        return this.generateDownloadLink(key).then(link => {
            // 添加一个时间戳
            const timeStamp = new Date().getTime();
            const url = `${link}?timestamp=${timeStamp}`;

            return axios({
                url,
                method: 'GET',
                responseType: 'stream',
                headers: {'Cache-Control': 'no-cache'}
            }).then(response => {
                const writer = fs.createWriteStream(downloadFile)
                response.data.pipe(writer);
                return new Promise((resolve, reject) => {
                    writer.on('finish', resolve)
                    writer.on('error', reject)
                })
            }).catch(err => {
                return Promise.reject({err: err.response});
            })
        })
    }
    // 获取文件信息
    getStat(key) {
        return new Promise((resolve, reject) => {
            this.bucketManager.stat(this.bucket, key,   this._handleCallBack(resolve, reject))
        })
    }

    // 返回值处理
    _handleCallBack(resolve, reject) {
        return (respErr, respBody, respInfo) => {
            if (respErr) {
                throw respErr;
            }
            if (respInfo.statusCode == 200) {
                resolve(respBody);
            } else {
                reject({
                    statusCode: respInfo.statusCode,
                    body: respBody
                });
            }
        };
    }
}

module.exports = QiniuManager;
