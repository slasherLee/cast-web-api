// 네이버 음성합성 Open API 예제
var url = require('url');
var express = require('express');
var app = express();
var client_id = 'KYUem5uvmi9VxIewng4b';
var client_secret = 'WOqziAzyJ4';
var fs = require('fs');
app.get('/tts', function (req, res) {
   var api_url = 'https://openapi.naver.com/v1/voice/tts.bin';
   var request = require('request');
   var parsed_url = url.parse(req.url, true);
   var options = {
       url: api_url,
       form: {'speaker':'mijin', 'speed':'0', 'text':parsed_url['query']['text']},
       headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
    };
    var writeStream = fs.createWriteStream('./tts1.mp3');
    var _req = request.post(options).on('response', function(response) {
       console.log(response.statusCode) // 200
       console.log(response.headers['content-type'])
    });
  _req.pipe(writeStream); // file로 출력
  _req.pipe(res); // 브라우저로 출력
 });
 app.listen(4000, function () {
   console.log('http://127.0.0.1:4000/tts app listening on port 4000!');
 });
