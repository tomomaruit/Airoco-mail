// --- 設定項目 ---
// 【要設定】通知を受け取りたいメールアドレスをここに設定する
const RECIPIENT_EMAIL = "hoge@example.com";

// CO2濃度のしきい値 (ppm)
const CO2_LIMIT = 800;
// --- 設定はここまで ---

// スクリプトプロパティに設定した内容を読み出す
const API_LINK = PropertiesService.getScriptProperties().getProperty('API_LINK')
/**
 * メインの処理を実行する関数
 * この関数をトリガーで定期実行すれば定期的に
 * 自動でチェックを行い条件を満たした際に通知することが可能
 */
function checkCo2AndNotify() {
  const url = API_LINK;
  
  try {
    // APIにリクエストを送信してデータを取得
    const response = UrlFetchApp.fetch(url, {
      'method': 'get',
      'muteHttpExceptions': true // HTTPエラー時に例外をスローせず、レスポンスを返す
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    // APIからの応答が正常でない場合はエラーログを残して終了
    if (responseCode !== 200) {
      Logger.log(`We can't get API Data. Status: ${responseCode}, Response: ${responseText}`);
      return;
    }
    
    const sensorDataArray = JSON.parse(responseText);
    
    // 取得した各センサーのデータをループ処理
    sensorDataArray.forEach(sensorData => {
      const sensorName = sensorData.sensorName;
      const co2 = sensorData.co2;

      // CO2のデータがなければ次のセンサーへ
      if (co2 === null || co2 === undefined) {
        Logger.log(`${sensorName}: CO2 data is NULL. So this sensor is skipped.`);
        return;
      }
      
      Logger.log(`${sensorName}: CO2 Concentration=${co2}ppm (LIMIT=${CO2_LIMIT}ppm)`);
      
      // CO2濃度がしきい値を超えているかチェック
      if (co2 >= CO2_LIMIT) {
        // しきい値を超えていたら、メール送信関数を呼び出す
        sendNotificationEmail(sensorData);
      }
    });
    
  } catch (e) {
    // スクリプト全体でエラーが発生した場合のログ
    Logger.log(`Error: ${e.toString()}`);
  }
}

/**
 * 警告メールを送信する関数
 * @param {Object} sensorData - しきい値を超えたセンサーのデータオブジェクト
 */
function sendNotificationEmail(sensorData) {
  // メール本文の整形に使用するためにsensorDataから必要部分を取り出す
  const sensorName = sensorData.sensorName;
  const co2 = sensorData.co2;
  const temperature = sensorData.temperature;
  const relativeHumidity = sensorData.relativeHumidity;
  
  // タイムスタンプを日本時間の "YYYY/MM/DD HH:mm:ss" 形式に変換する
  const timestamp = new Date(sensorData.timestamp * 1000); // 測定時刻の形式を揃えるための処理(1000倍)
  const formattedTimestamp = Utilities.formatDate(timestamp, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  // メールの件名と本文を作成
  const subject = `[PBLExp1_IoT] CO2 Alert: Threshold exceeded at ${sensorName}`; // 実験プログラムからの送信を明記
  // 本文ここから
  const body = `
The CO2 level at "${sensorName}" has exceeded the set threshold of ${CO2_LIMIT} ppm.
Please ventilate the area.

--- Details ---

Measurement Time: ${formattedTimestamp}
Location: ${sensorName}
CO2 Concentration: ${co2} ppm
Temperature: ${temperature} °C
Relative Humidity: ${relativeHumidity} %

---
This is an automated notification sent from Google Apps Script.
  `; // 本文ここなで
  
  try { //try-catch文の実装
    MailApp.sendEmail(RECIPIENT_EMAIL, subject, body);
    Logger.log(`${sensorName}has exceeded ${co2}ppm. So sent e-mail.`);
  } catch (e) {
    Logger.log(`We can't send e-mail.: ${e.toString()}`);
  }
}
