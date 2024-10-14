const { response } = require("../app");
const request = require('request');
var  homepageService = require ("../services/homepageService");
var chatbotService = require("../services/chatbotService");
var templateMessage = require ("../services/templateMessage");

require("dotenv").config();


const MY_VERIFY_TOKEN = process.env.MY_VERIFY_TOKEN;

let getHomePage = (req, res) => {
    let facebookAppId = process.env.FACEBOOK_APP_ID;
    return res.render("homepage.ejs", {
        facebookAppId: facebookAppId
    })
};
let getWebhook = (req, res) => {
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = MY_VERIFY_TOKEN;

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
};

let postWebhook =  (req, res) => {
    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {
            //check the incoming message from primary app or not; if secondary app, exit
            if (entry.standby) {
                //if user's message is "back" or "exit", return the conversation to the bot
                let webhook_standby = entry.standby[0];
                if (webhook_standby && webhook_standby.message) {
                    if (webhook_standby.message.text === "back" || webhook_standby.message.text === "exit") {
                        // call function to return the conversation to the primary app
                        // chatbotService.passThreadControl(webhook_standby.sender.id, "primary");
                        chatbotService.takeControlConversation(webhook_standby.sender.id);
                    }
                }

                return;
            }

                // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log("",webhook_event);


            if(webhook_event.messaging_feedback && webhook_event.messaging_feedback.feedback_screens){
                let response1 = {
                    "text": " Cảm ơn Quý Khách đã để lại góp ý! \n Empty Arena Billiards sẽ cải thiện để mang tới cho khách hàng những trải nghiệm tốt nhất!"
                };
                chatbotService.sendMessage(sender_psid, response1);
                console.log(JSON.stringify(webhook_event.messaging_feedback.feedback_screens, null, 2));
            }

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
};

let postwebhookZalo = (req, res) => {
    // Parse the request body from the POST
    try {
 let body = req.body;
  console.log("body :" , body);// Return a '200 OK' response to all events
    return res.status(200).send('EVENT_RECEIVED');
    }
  
catch(error)
{
    console.log("error" , error)
    return res.status(404).send(error);
}
   } 
let handleMessage = async (sender_psid, received_message) => {
      //check the incoming message is a quick reply?
    if (received_message && received_message.quick_reply && received_message.quick_reply.payload) {
        let payload = received_message.quick_reply.payload;
        if (payload === "ZALO_REF") {
            await chatbotService.sendZALOOATemplate(sender_psid);

        } else if (payload === "LOOKUP_ORDER") {
            await chatbotService.sendLookupOrder(sender_psid);

        } else if (payload === "TALK_AGENT") {
            await chatbotService.requestTalkToAgent(sender_psid);
        }

        return;
    }


    let response;

    // Check if the message contains text
    if (received_message.text) {
        // Create the payload for a basic text message
        response = {
            "text": `Hiện tại tin nhắn của bạn đang không trong Form của hệ thống vui lòng bấm Bắt Đầu để nhắn lại | \n Hoặc bạn muốn tư vấn trực tiếp vui lòng chọn Hỏi Đáp ! `
        }
    } 

    // Sends the response message
    await chatbotService.sendMessage(sender_psid, response);
};


function callSendAPI(sender_psid, response) {
    // Construct the message body
  
    let request_body = {
      "recipient": {
        "id": sender_psid
      },
      
      "message": response
    }
  
    // Send the HTTP request to the Messenger Platform
    request({
      "uri": "https://graph.facebook.com/v2.6/me/messages",
      "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN},
      "method": "POST",
      "json": request_body
    }, (err, res, body) => {
      if (!err) {
        console.log('message sent!')
   
      } else {
        console.error("Unable to send message:" + err);
      }
    }); 
  }
  
// Handles messaging_postbacks events
let handlePostback = async (sender_psid, received_postback) => {
    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    switch (payload) {
        case "GET_STARTED":
        case "RESTART_CONVERSATION":
            await chatbotService.sendMessageWelcomeNewUser(sender_psid);
            break;
        case "TALK_AGENT":
            await chatbotService.requestTalkToAgent(sender_psid);
            break;
        case "ZALO_REF":
            await chatbotService.sendZALOOATemplate(sender_psid);
            break;
        case "BACK_TO_MAIN_MENU":
            await chatbotService.backToMainMenu(sender_psid);
            break;
        case "SEND_QUICKREPLY":
            await chatbotService.sendQuickReply(sender_psid);
            break;
        case "FEEDBACK":
             await handleFeedback(sender_psid);
        
            break;
        default:
            console.log("run default switch case")

    }
};

let handleSetupProfile = async (req, res) => {
    try {
        await homepageService.handleSetupProfileAPI();
        return res.redirect("/");
    } catch (e) {
        console.log(e);
    }
};

let handleFeedback = async ( sender_psid) => {
    try {
        const result = await chatbotService.FEEDBACK(sender_psid);
    
       
    } catch (e) {
        console.log(e);
    }
};
let sendRespond 
let verify = async (req, res) => {
  
        return res.render("verify.ejs")
   
};

let getSetupProfilePage = (req, res) => {
    return res.render("profile.ejs");
};

let getInfoOrderPage = (req, res) => {
    let facebookAppId = process.env.FACEBOOK_APP_ID;
    return res.render("infoOrder.ejs", {
        facebookAppId: facebookAppId
    });
};

let setInfoOrder = async (req, res) => {
    try {
        let customerName = "";
        if (req.body.customerName === "") {
            customerName = "Empty";
        } else customerName = req.body.customerName;

        // I demo response with sample text
        // you can check database for customer order's status

        let response1 = {
            "text": `---Info about your lookup order---
            \nCustomer name: ${customerName}
            \nEmail address: ${req.body.email}
            \nOrder number: ${req.body.orderNumber}
            `
        };

        let response2 = templateMessage.setInfoOrderTemplate();

        await chatbotService.sendMessage(req.body.psid, response1);
        await chatbotService.sendMessage(req.body.psid, response2);

        return res.status(200).json({
            message: "ok"
        });
    } catch (e) {
        console.log(e);
    }
};

module.exports = {
    getHomePage: getHomePage,
    getWebhook: getWebhook,
    postWebhook: postWebhook,
    handleSetupProfile: handleSetupProfile,
    getSetupProfilePage: getSetupProfilePage,
    getInfoOrderPage: getInfoOrderPage,
    setInfoOrder: setInfoOrder,
    verify : verify,
    postwebhookZalo : postwebhookZalo,
};


