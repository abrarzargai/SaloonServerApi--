const UserUtilitiesModel = require('../models/UserUtilitiesModel');
const UtilitiesModel = require('../models/UtilitiesModel');

const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId;
const ImgBase = 'https://odl-saloonwizz-app.herokuapp.com/images/'
/***************Services************/

exports.Add = catchAsync(async (req, res, next) => {
    console.log("hit", req.files)

    const IsFound = await UserUtilitiesModel.find({
        User: req.body.User
    })
    var found = false
    const index = IsFound.map((x)=>{
       if(x.Utilities.Title === req.body.UtilitiesTitle){
        found =true;
        
       }
    })
    console.log("index", index)
    if (found) {
        throw new Error('Error! User already have applied for this Utility');
    }
    
    console.log("data",req.body)

    const Record = await UserUtilitiesModel.create({
        ...req.body,
        Utilities: {
            Title: req.body.UtilitiesTitle,
            ...(req.body.UtilitiesSupplier && { Supplier: req.body.UtilitiesSupplier })
        },
        ...(req.files[0] && { LastBill: ImgBase + req.files[0].filename }),
        ...(req.files[1] && { LOAForm: ImgBase + req.files[1].filename })
    })
    console.log(Record)
    if (!Record) {
        throw new Error('Error! Utilities Cannot be added');
    }
    else {
        return res.status(201).json({
            success: true, message: "Utilities has been added to User Record Successfully", Record
        })
    }

})

exports.Update = catchAsync(async (req, res, next) => {
    console.log("hit", req.files)

    const IsFound = await UserUtilitiesModel.findOne({"_id":req.body.Id})
    console.log("IsFound", IsFound)
    if (!IsFound) {
        throw new Error('Error! User have not applied for this Utility');
    }

    console.log("data")

    const Record = await UserUtilitiesModel.updateOne({"_id":req.body.Id},{
        ...req.body,
        Utilities: {
            Title: req.body.UtilitiesTitle,
            ...(req.body.UtilitiesSupplier && { Supplier: req.body.UtilitiesSupplier })
        },
        ...(req.files[0] && { LastBill: ImgBase + req.files[0].filename }),
        ...(req.files[1] && { LOAForm: ImgBase + req.files[1].filename })
    })
    if (!Record.nModified > 0) {
        throw new Error('Error! User Utilities Cannot be updated');
    }
    else {
        return res.status(201).json({
            success: true, message: "User Utilities has been updated  Successfully"
        })
    }

})

exports.Delete = catchAsync(async (req, res, next) => {
    try {
        const Record = await UserUtilitiesModel.deleteOne({ "_id": req.body.Id });
        if (Record.deletedCount == 0) {
            return res.status(500).json({
                success: false, message: "Error!  User Utilities Details Not found for this Id"
            })
        }

        return res.status(200).json({
            success: true, message: " User Utilities Deleted Successfully"
        })


    } catch (error) {
        return res.status(500).json({
            success: false, message: "Error!  User Utilities Details Not found for this Id"
        })
    }
})

//Getone
exports.GetOne = catchAsync(async (req, res, next) => {

    const Data = await UserUtilitiesModel.aggregate([
        {
            $match: {
                User:  ObjectId(req.body.User)
            }
        },
        // {
        //     $lookup: {
        //         from: "users",       // other table name
        //         localField: "User",   // name of users table field
        //         foreignField: "_id", // name of userinfo table field
        //         as: "User"         // alias for userinfo table
        //     }
        // }
    ])
    const Utilities = await UtilitiesModel.find()
    let active = [];
    let Pending = [];
    let inaactive = [];

    Utilities.map((utilityMap)=>{
        const index = Data.findIndex(DataMap => DataMap.Utilities.Title === utilityMap.Title)
        console.log(index)
        if (index>-1){
            let missing = []
            if (!Data[index].IsPaid) { missing.push('IsPaid')}
            if (!Data[index].ContractExpiryDate) { missing.push('ContractExpiryDate')}
            if (!Data[index].LastBill) { missing.push('LastBill')}
            if (!Data[index].LOAForm) { missing.push('LOAForm')}
            console.log(Data[index])
            active.push({ Utilities: utilityMap, UserUtility: Data[index], Missing: missing})
        }else{
            inaactive.push({ Utilities: utilityMap});
        }

    }) 

    if (active[0]) {

        return res.status(200).json({
            success: true, message: "Utility Found for this User", active, inaactive, Data:Data||[]
        })

    }else{
        inaactive = Utilities;
           return res.status(200).json({
            success: true, message: "Utility Found for this User", active, inaactive,Data:Data||[] 
        })
        
    }
    
        return next(new Error('No Utility Found for this User'))

    
})

//Getone
exports.getUtilitiesOfOneUser = catchAsync(async (req, res, next) => {

    const Data = await UserUtilitiesModel.aggregate([
        {
            $match: {
                User: ObjectId(req.body.User)
            }
        },
    ])
    const Utilities = await UtilitiesModel.find()
    let active = [];
    let Pending = [];
    let inaactive = [];

    Utilities.map((utilityMap) => {
        const index = Data.findIndex(DataMap => DataMap.Utilities.Title === utilityMap.Title)

        if (index > -1) {
            let missing = []
            if (!Data[index].IsPaid) { missing.push('IsPaid') }
            if (!Data[index].ContractExpiryDate) { missing.push('ContractExpiryDate') }
            if (!Data[index].LastBill) { missing.push('LastBill') }
            if (!Data[index].LOAForm) { missing.push('LOAForm') }

            let date = new Date(Data[index].ContractExpiryDate || '')
            var newdate = new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 2,
                new Date().getDate()
            );
            console.log(newdate.toISOString() > date.toISOString())
            console.log(newdate.toISOString(), date.toISOString())

            if (missing.length > 0) {
                Data[index].isActive = 'fillform'
            }
            else{
                if (newdate.toISOString() < date.toISOString()) {
                    console.log('expiry hit')
                    Data[index].isActive = 'Expired'
                } else {


                    Data[index].isActive = 'activated'

                }
            }

            if (missing.length)
                console.log(Data[index])
            active.push({ Utilities: utilityMap, UserUtility: Data[index], Missing: missing })
        } else {
            utilityMap.isActive = 'inactive'
            inaactive.push({ Utilities: utilityMap });
        }

    })

    if (active[0]) {

        return res.status(200).json({
            success: true, message: "Utility Found for this User", active, inaactive, UserUtilities: Data || [], AllUtilties: Utilities || []
        })

    } else {
        inaactive = Utilities;
        return res.status(200).json({
            success: true, message: "Utility Found for this User", active, inaactive, UserUtilities: Data || [], AllUtilties: Utilities || []
        })

    }

    return next(new Error('No Utility Found for this User'))


})

exports.GetAll = catchAsync(async (req, res, next) => {

    const Response = await UserUtilitiesModel.aggregate([
        {
            $lookup: {
                from: "users",       // other table name
                localField: "User",   // name of users table field
                foreignField: "_id", // name of userinfo table field
                as: "User"         // alias for userinfo table
            }
        },
        { $sort: { ContractExpiryDate: 1 } }
    ])
    let Active = [];
    let Pending = [];
    Response.map((Data)=>{
    let missing = []
    if (!Data.IsPaid) { missing.push('IsPaid')}
    if (!Data.ContractExpiryDate) { missing.push('ContractExpiryDate')}
    if (!Data.LastBill) { missing.push('LastBill')}
    if (!Data.LOAForm) { missing.push('LOAForm')}
    console.log("Data", Data)
     
    if(missing.length){
        Data.missing = missing
        Pending.push(Data)
    }else{
        Active.push(Data);
    }
})

   if(Response[0]){
        return res.status(200).json({
            success: true, message: "Utility Found for this User", Active,Pending
        })

    }
    else {
        return next(new Error('No Utility Found for this User'))

    }
})

exports.AddDeal = catchAsync(async (req, res, next) => {

    const User = await UserUtilitiesModel.find({ "_id": req.body.Id })
    if (User[0]) {
        console.log("req.body", req.body)
        const index = User[0].DealList.find((x) => x.Title == req.body.Title)
        console.log("index", index)
        if (!index) {
            User[0].DealList.push({
                Title: req.body.Title,
                Description: req.body.Description,
            })
            await User[0].save()
            let Data = User[0]
            return res.status(200).json({
                success: true, message: "Deal Added Successfully", Data
            })
        }
        throw new Error(`Error!  You Have Already send Deal ${req.body.Title} to This User  `);


    }
    else {
        return next(new Error('Utility not found'))

    }

})


exports.DeleteDeal = catchAsync(async (req, res, next) => {

    const User = await UserUtilitiesModel.find({ "_id": req.body.Id })
    if (User[0]) {
        console.log("req.body", req.body)
        const index = User[0].DealList.findIndex((x) => x.Title == req.body.Title)
        console.log("index", index)
        if (index > -1) {
            User[0].DealList.splice(index, 1)
            await User[0].save()
            let Data = User[0]
            return res.status(200).json({
                success: true, message: "Social Media Account Deleted Successfully", Data
            })
        }
        throw new Error(`Error!  No ${req.body.Title} Deal added yet `);


    }
    else {
        return next(new Error('Utility not found'))

    }

})

exports.AcceptDeal = catchAsync(async (req, res, next) => {

    const User = await UserUtilitiesModel.find({ "_id": req.body.Id })
    if (User[0]) {
        console.log("User[0].DealList", User[0].Deal.Title)
     //   if (!User[0].Deal.Title) {
            User[0].Deal.Title = req.body.Title;
            User[0].Deal.Description = req.body.Description;
            await User[0].save()
            let Data = User[0]
            return res.status(200).json({
                success: true, message: "Deal Accepted Successfully", Data
            })
   //     }
   //    throw new Error(`Error!  You Have Already Subscribed any other Deal `);


    }
    else {
        return next(new Error('Utility not found'))

    }

})
