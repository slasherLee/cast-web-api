// 네이버 음성합성 Open API 예제
var url = require('url');
var express = require('express');
var app = express();
var client_id = 'KYUem5uvmi9VxIewng4b';
var client_secret = 'WOqziAzyJ4';
var fs = require('fs');
app.get('/tts', function (req, res) {
   var request = require('request');
   var googleTTS = require('google-tts-api');
   /*var api_url = */googleTTS('감사합니다.', 'ko-KR', 1)
   .then(function(api_url) {
   	console.log('api_url : ' + api_url);
   var options = {
       url: api_url,
       headers: { 'user-agent': 'WHAT_EVER' }
    };
    var writeStream = fs.createWriteStream('./tts1.mp3');
    var _req = request.post(options).on('response', function(response) {
       console.log(response.statusCode) // 200
       console.log(response.headers['content-type'])
    });
  _req.pipe(writeStream); // file로 출력
  _req.pipe(res); // 브라우저로 출력
 });
   });
 app.listen(4000, function () {
   console.log('http://127.0.0.1:4000/tts app listening on port 4000!');
 });

