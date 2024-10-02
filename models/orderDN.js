var mongoose = require('mongoose');
var order = mongoose.Schema(
   {
      name: {
         type: String,
         require : true
      },
      time: {
         type: Date,
         require : true
      },
      phone: {
         type: String,
         require : true
      }
   }
);
var UserModel = mongoose.model('orderDN', order);
module.exports = UserModel;

