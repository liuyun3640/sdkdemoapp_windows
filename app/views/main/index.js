import React, { PureComponent } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { Modal } from "antd";
import Navbar from "./navbar";
import Container from "./container";
import * as actionCreators from "@/stores/actions";
import TopNav from "./topnav";
import moment from "moment";
import { utils } from "@/utils/utils";
import { userChange } from "./receive_notice";
import api from "@/api";
import _ from "underscore";
// var fs = require("fs-extra");

// const { remote } = require("electron");
// let configDir = remote.app.getPath("userData");
const easemob = require('../../node/index');
/**
 var easemob;
if(process.platform !== "darwin"){
	easemob = require("@/easemob/easemobWin.node");
}
else{
	easemob = require("@/easemob/easemobMac.node");
}
 */

// require("hazardous");

// var en = require("@/easemob/easemob.node");
// var db = global.process.dlopen(module, en);
// const a = "1";


class MainView extends PureComponent {

	constructor(props){
		var conversation;
		var messages;
		super(props);
		console.log("index");
		var me = this;
		const {
			globals,
			userInfo,
			logout,
			globalAction,
			allMembersInfo,
			unReadMsgCountAction,
			initConversationsActiton,
			networkConnectAction,
			setNotice,
			setAllContacts,
			setGroupChats
		} = this.props;
		if(userInfo && userInfo.user && userInfo.user.id){
			if(globals.emclient){
				this.emclient = globals.emclient;
			}
			else{
				this.emclient = utils.initEmclient();
			}
			this.emclient.login( userInfo.user.easemobName, userInfo.user.easemobPwd);
			this.log = new easemob.EMLog();
			this.error = new easemob.EMError();

			this.emCallback = new easemob.EMCallback();

			this.connectListener = new easemob.EMConnectionListener();
			this.connectListener.onDisconnect = function(error){
				console.log("EMConnectionListener onDisconnect");
				console.log(error.errorCode);
				console.log(error.description);

				// code == 206 被踢，需要去验证 session
				if(error.errorCode == 206){
					console.log("EMConnectionListener onDisconnect");
					console.log(error.errorCode);
					console.log(error.description);
					this.emclient.logout();
					logout(); // 这个只是我前端用来控制 ui 上的展示的，跟 emclient 没有关系

					Modal.info({
						title: "提示",
						content: (
							<div>你的账户已在其他地方登录</div>
						),
						onOk(){
						}
					});
				}
				else{
					// 尝试发一条 cmd 消息，看看网络有没有真的断掉
					me.sendTempCmd();
				}
			};
			this.emclient.addConnectionListener(this.connectListener);


			this.chatManager = this.emclient.getChatManager();

			// this.chatManager.loadAllConversationsFromDB(); // 每一条会话加载 20 条消息到缓存中
			this.listener = new easemob.EMChatManagerListener();
			this.listener.onReceiveMessages((messages) => {
				console.log("\n\n EMChatManagerListener onReceiveHasReadAcks ----- !");
				console.log(messages[0].conversationId());
				setTimeout(function(){
					me.onReceiveMsg(messages);
				}, 1);
			});

			this.listener.onReceiveCmdMessages ((messages) => {
				console.log("\n\n EMChatManagerListener onReceiveCmdMessages ----- !");
				setTimeout(function(){
					userChange(messages, me.props);
				}, 1);
			});

			// 收到消息撤回
			this.listener.onReceiveRecallMessages ((message) => {
				me.onReceiveRecallMessages(message);
			});
			// addListener(listener) 添加消息回调监听，从监听中获取接收消息。
			this.chatManager.addListener(this.listener);
			this.contactManager = this.emclient.getContactManager();


			this.groupManager = this.emclient.getGroupManager();
			globalAction({
				emclient: this.emclient,
				chatManager: this.chatManager,
				easemob,
				log: this.log,
				groupManager: this.groupManager,
				emCallback: this.emCallback,
				groupManager: this.groupManager,
				contactManager:this.contactManager
			});


			
			this.contactListener = new easemob.EMContactListener();
			
			this.contactListener.onContactAdded((username) => {
				const {addContact} = this.props;
				console.log("onContactAdded username: " + username);
				addContact(username);
			});
			this.contactListener.onContactDeleted((username) => {
				const {removeContact} = this.props;
				console.log("onContactDeleted username: " + username);
				removeContact(username);
			});
			this.contactListener.onContactInvited((username, reason) => {
				setTimeout(()=>{
					var error = new easemob.EMError();
					console.log("onContactInvited username: " + username + " reason: " + reason);
					let con = confirm(username + "请求添加好友,是否同意");
					if (con == true) {
						console.log("agree invite");
					  this.contactManager.acceptInvitation(username, error);
					} else {
					  contactManager.declineInvitation(username, error);
					}
				},500);
				
				
				console.log("error.errorCode = " + error.errorCode);
				console.log("error.description = " + error.description);
			});
			this.contactListener.onContactAgreed((username) => {
				console.log("onContactAgreed username: " + username);
			});
			this.contactListener.onContactRefused((username) => {
				console.log("onContactRefused username: " + username);
			});
			
			this.contactManager.registerContactListener(this.contactListener);
			
			this.groupListener = new easemob.EMGroupManagerListener(this.groupManager);
			this.groupManager.addListener(this.groupListener);
			// 邀请别人入群被同意时触发
			// group : 发生操作的群组
			// invitee : 同意邀请的人

			// this.groupListener.onReceiveInviteAcceptionFromGroup = function(group, invitee){
			// 	me.onReceiveInviteAcceptionFromGroup(group, invitee);
			// };

			// 接收入群组邀请时触发
			// groupId : 邀请进入群组的群组id
			// inviter : 邀请人
			// inviteMessage : 邀请信息
			// this.groupListener.onReceiveInviteFromGroup = function(groupId, inviter, inviteMessage){
			// 	console.log("\n\n EMGroupManagerListener onReceiveInviteFromGroup ----- !");
			// 	console.log(`groupId = ${groupId}`);
			// 	console.log(`inviter = ${inviter}`);
			// 	console.log(`inviteMessage = ${inviteMessage}`);
			// 	// var error = new easemob.EMError();
			// 	me.onReceiveInviteFromGroup(groupId, inviter, inviteMessage);
			//
			// 	// acceptInvitationFromGroup(groupId, inviter, error) 同意加入群组
			// 	// groupId : 同意加入的群组id
			// 	// inviter : 邀请者
			// 	// error : 错误信息
			//
			// 	// var group = groupManager.acceptInvitationFromGroup(groupId, inviter, error);
			// 	// console.log(`error.errorCode = ${error.errorCode}`);
			// 	// console.log(`error.description = ${error.description}`);
			// 	// console.log(`group.groupId() = ${group.groupId()}`);
			// 	// console.log(`group.groupSubject() = ${group.groupSubject()}`);
			// 	// console.log(`group.groupDescription() = ${group.groupDescription()}`);
			//
			// 	// declineInvitationFromGroup(groupId, inviter, reason, error);
			// 	// groupId : 同意加入的群组id
			// 	// inviter : 邀请者
			// 	// reason : 拒绝加入的原因
			// 	// error : 错误信息
			// 	/*
			// 	groupManager.declineInvitationFromGroup(groupId, inviter, "hahahahaha", error);
			// 	console.log("declineInvitationFromGroup ret.errorCode = " + error.errorCode);
			// 	console.log("declineInvitationFromGroup ret.description = " + error.description);
			// 	*/
			// };

			// 添加群管理员时触发(只有是自己时才能收到通知)
			// group : 发生操作的群组
			// admin : 被提升的群管理员
			this.groupListener.onAddAdminFromGroup((groupId, admin) => {
				setTimeout(function(){
					me.onAddAdminFromGroup(groupId, admin);
				}, 1);
			});

			// 删除群管理员时触发(只有是自己时才能收到通知)
			// group : 发生操作的群组
			// admin : 被删除的群管理员（群管理员变成普通群成员）
			this.groupListener.onRemoveAdminFromGroup((groupId, admin) => {
				setTimeout(function(){
					me.onRemoveAdminFromGroup(groupId, admin);
				}, 1);
			});

			// 转让群主的时候触发
			// group : 发生操作的群组
			// newOwner : 新群主
			// oldOwner : 原群主
			this.groupListener.onAssignOwnerFromGroup((groupId, newOwner, oldOwner) => {
				setTimeout(function(){
					me.onAssignOwnerFromGroup(groupId, newOwner, oldOwner);
				}, 1);
			});

			// 我接收到自动进群时被触发
			// group : 发生操作的群组
			// inviter : 邀请人
			// inviteMessage : 邀请信息
			this.groupListener.onAutoAcceptInvitationFromGroup((groupId, inviter, inviteMessage)=>{
				setTimeout(function(){
					me.onAutoAcceptInvitationFromGroup(groupId, inviter, inviteMessage);
				}, 1);
			});

			// 成员加入群组时触发
			// group : 发生操作的群组
			// member : 加入群组的成员名称
			this.groupListener.onMemberJoinedGroup((groupId, member)=>{
				console.log("-----member:" + member);
				setTimeout(function(){
					me.onMemberJoinedGroup(groupId, member);
				}, 1);
			});

			// 成员离开群组时触发
			// group : 发生操作的群组
			// member : 离开群组的成员名称
			this.groupListener.onMemberLeftGroup((groupId, member)=>{
				console.log("-----member:" + member);
				setTimeout(function(){
					me.onMemberLeftGroup(groupId, member);
				}, 1);
			});

			// 离开群组时触发
			// group : 发生操作的群组
			// reason : 离开群组的原因（0: 被踢出 1:群组解散 2:被服务器下线）
			this.groupListener.onLeaveGroup((groupId, reason)=>{
				setTimeout(function(){
					me.onLeaveGroup(groupId, reason);
				}, 1);
			});

			// 多设备监听
			this.multiDevicesListener = new easemob.EMMultiDevicesListener();
			this.multiDevicesListener.onContactMultiDevicesEvent((operation, target, ext) => {
				console.log("onContactMultiDevicesEvent");
				console.log(`operation : ${operation}`);
				console.log(`target : ${target}`);
				console.log(`ext : ${ext}`);
			});
			this.multiDevicesListener.onGroupMultiDevicesEvent((operation, target, usernames) => {
				console.log(`operation : ${operation}`);
				console.log(`target : ${target}`);
				console.log(`usernames : ${usernames}`);
				me.onGroupMultiDevices(operation, target, usernames);
			});
			this.emclient.addMultiDevicesListener(this.multiDevicesListener);

			// this.ret = this.emclient.login(
			// 	(userInfo && userInfo.user.easemobName),
			// 	(userInfo && userInfo.user.easemobPwd)
			// );
			// console.log(`loginCode:${this.ret.errorCode}`);
			// if(this.ret.errorCode != 0){
			// 	setNotice(`登录失败，${this.ret.errorCode}`);
			// 	this.emclient.logout();
			// 	logout();
			// }

			// 获取好友列表
			var error = new easemob.EMError();
			var contacts = this.contactManager.allContacts(error);
			console.error("error.errorCode:" + error.errorCode + "  description:" + error.description,);
			console.log("allContacts length:" + contacts.length);
			contacts.map((item) => {
				console.log(item);
			})
			setAllContacts({contacts});

			// 获取用户所在的组
			this.groupManager.fetchAllMyGroups(error).then(groups => {
				let allGroups = [];
				groups.map((group) => {
					allGroups.push(group.groupId());
				});
				setGroupChats({allGroups});
			});
			


			// this.chatManager.getConversations();// 获取缓存中的会话列表
			let conversationType = 0;
			this.chatManager.getConversations().map((item) => {
				var msgObj = {};
				var unReadMsgMsgId = [];
				conversationType = item.conversationType();
				//conversation = this.chatManager.conversationWithType(item.conversationId(), conversationType);
				messages = item.loadMoreMessagesByMsgId("", 20,0);
				messages.map((msg) => {
					msgObj[msg.msgId()] = msg.isRead();
				});
				_.map(msgObj, (msg, key) => {
					!msg && unReadMsgMsgId.push(key);
				});
				unReadMsgCountAction({ id: item.conversationId(), unReadMsg: unReadMsgMsgId });
				initConversationsActiton({ id: item.conversationId(), msgs: messages, "conversation":item });
			});

			const updateOnlineStatus = () => {
				if(navigator.onLine){
					// 尝试发一条 cmd 消息，看看网络有没有真的断掉
					this.sendTempCmd();
					networkConnectAction();
				}
				else{
					networkConnectAction("连接已断开");
				}
			};
			window.addEventListener("online",  updateOnlineStatus);
			window.addEventListener("offline",  updateOnlineStatus);
		}
		else{
			this.props.history.push("/index");
		}
		// updateOnlineStatus();
	}

	sendTempCmd(){
		const { userInfo, conversations } = this.props;
		let cmdMsgBody = new easemob.EMCmdMessageBody("testAction");
		// let anyone = _.find(allMembersInfo, item => item.easemobName);
		_.map(conversations, (conversation) => {
			let cmdMessage = easemob.createSendMessage(userInfo.user.easemobName, conversation.conversationId(), cmdMsgBody);
			cmdMessage.setAttribute("");
			this.chatManager.sendMessage(cmdMessage);
		});

		console.log("sendCmd");
	}

	// 多设备群组操作回调
	onGroupMultiDevices(operation, target, usernames){
		const { setAdminAction, cancelAdminAction, setOwnerAction, groupChats, leaveGroupAction } = this.props;
		switch(operation){
		case 12:	// 加入群组
			// leaveGroupAction(target);
			break;
		case 13:	// 离开群组
			leaveGroupAction(target);
			break;
		case 26:	// 设为管理员
			//setAdminAction({ id: target, adminMember: usernames[0], group: groupChats[target] });
			break;
		case 27:	// 取消管理员
			//cancelAdminAction({ id: target, adminMember: usernames[0], group: groupChats[target] });
			break;
		case 25:	// 更换群主
			//setOwnerAction({ id: target, owner: usernames[0], group: groupChats[target] });
			break;
		default:
			break;
		}
	}

	// 收到消息撤回
	onReceiveRecallMessages(message){
		const { recallMessageAction, messages, userInfo } = this.props;
		const conversationId = message[0].conversationId();
		var msgs = messages[conversationId];
		var messageText;
		var textMsgBody;
		var textRecvMsg;
		var conversationType = message[0].chatType();
		var conversation = this.chatManager.conversationWithType(conversationId, conversationType);
		this.asyncGetMemberInfo(message[0].from())
		.done(function(name){
			var recallMsgUser = message[0].from() == userInfo.user.easemobName ? "您" : name;
			messageText = `${recallMsgUser} 撤回了一条消息`;
			textMsgBody = new easemob.EMTextMessageBody(messageText);
			textRecvMsg = easemob.createReceiveMessage(conversationId, userInfo.user.easemobName, textMsgBody);
			textRecvMsg.setFrom("oa-easemob-system");
			recallMessageAction({
				messages: msgs,
				id: message[0].conversationId(),
				recallMsg: message[0],
				insertMsg: textRecvMsg,
				conversation
			});
		});
	}

	// 我接收到自动进群时被触发
	// group : 发生操作的群组
	// inviter : 邀请人
	// inviteMessage : 邀请信息
	onAutoAcceptInvitationFromGroup(groupId, inviter, inviteMessage){
		var me = this;
		var conversation;
		var textMsgBody;
		var textRecvMsg;
		var messageText;
		var group = this.groupManager.groupWithId(groupId);
		console.log("\n\n EMGroupManagerListener onAutoAcceptInvitationFromGroup ----- !");
		console.log(`group.groupId() = ${group.groupId()}`);
		console.log(`group.groupSubject() = ${group.groupSubject()}`);
		console.log(`group.groupDescription() = ${group.groupDescription()}`);
		console.log(`inviter = ${inviter}`);
		console.log(`inviteMessage = ${inviteMessage}`);
		const {
			userInfo,
		} = this.props;

		// group = this.groupManager.fetchGroupSpecification(group.groupId(), this.error, true);
		// this.groupManager.fetchGroupMembers(group.groupId(), "", 500, this.error);
		conversation = this.chatManager.conversationWithType(group.groupId(), 1);
		/*
		this.asyncGetMemberInfo(inviter, group)
		.done(function(name){
			messageText = inviter == "系统管理员" ? `群 ${name} 创建成功` : `${name} 邀请你进群`;
			textMsgBody = new easemob.EMTextMessageBody(messageText);
			textRecvMsg = easemob.createReceiveMessage(group.groupId(), userInfo.user.easemobName, textMsgBody);
			textRecvMsg.setFrom("oa-easemob-system");
			conversation.insertMessage(textRecvMsg);
			requestGroupInfo(userInfo.user.tenantId, group.groupId(), conversation, me.groupManager, me.error);
		});
		*/
		// msgs = messages[group.groupId()] && messages[group.groupId()].length > 0 ? [textRecvMsg].concat(messages[group.groupId()]) : [textRecvMsg];
		// receiveJoinGroupAction(
		// 	{
		// 		id: group.groupId(),
		// 		inviter,
		// 		members: [userInfo.user.easemobName],
		// 		conversation,
		// 		inviterRealName: inviter,
		// 	}
		// );
	}

	asyncGetMemberInfo(inviter, group){
		var df = $.Deferred();
		var messageText;
		const {
			userInfo,
			getMemberInfoAction,
			allMembersInfo,
		} = this.props;
		if(inviter == "系统管理员"){
			df.resolve(group ? group.groupSubject() : "");
		}
		else if(allMembersInfo[inviter]){
			messageText = allMembersInfo[inviter].realName || allMembersInfo[inviter].easemobName;
			df.resolve(messageText);
		}
		else{
			api.getMemberInfo(userInfo.user.tenantId, inviter)
			.done(function(data){
				getMemberInfoAction(data);
				df.resolve(data.realName);
			})
			.fail(function(){
				df.resolve(inviter);
			});
		}
		return df.promise();
	}

	// 添加群管理员时触发(只有是自己时才能收到通知)
	// group : 发生操作的群组
	// admin : 被提升的群管理员
	onAddAdminFromGroup(groupId, admin){
		var group = this.groupManager.groupWithId(groupId);
		console.log("\n\n EMGroupManagerListener onAddAdminFromGroup ----- !");
		console.log(`group.groupId() = ${group.groupId()}`);
		console.log(`group.groupSubject() = ${group.groupSubject()}`);
		console.log(`group.groupDescription() = ${group.groupDescription()}`);
		console.log(`admin = ${admin}`);
	}

	// 删除群管理员时触发(只有是自己时才能收到通知)
	// group : 发生操作的群组
	// admin : 被删除的群管理员（群管理员变成普通群成员）
	onRemoveAdminFromGroup(groupId, admin){
		var group = this.groupManager.groupWithId(groupId);
		console.log("\n\n EMGroupManagerListener onRemoveAdminFromGroup ----- !");
		console.log(`group.groupId() = ${group.groupId()}`);
		console.log(`group.groupSubject() = ${group.groupSubject()}`);
		console.log(`group.groupDescription() = ${group.groupDescription()}`);
		console.log(`admin = ${admin}`);
		const { cancelAdminAction, groupChats } = this.props;
		groupChats[group.groupId()] && cancelAdminAction({ id: group.groupId(), adminMember: admin, group: groupChats[group.groupId()] });
	}

	// 转让群主的时候触发
	// group : 发生操作的群组
	// newOwner : 新群主
	// oldOwner : 原群主
	onAssignOwnerFromGroup(groupId, newOwner, oldOwner){
		var group = this.groupManager.groupWithId(groupId);
		console.log("\n\n EMGroupManagerListener onAssignOwnerFromGroup ----- !");
		console.log(`group.groupId() = ${group.groupId()}`);
		console.log(`group.groupSubject() = ${group.groupSubject()}`);
		console.log(`group.groupDescription() = ${group.groupDescription()}`);
		console.log(`newOwner = ${newOwner}`);
		console.log(`oldOwner = ${oldOwner}`);
		const { setOwnerAction, groupChats } = this.props;
	}

	// 成员加入群组时触发
	// group : 发生操作的群组
	// member : 加入群组的成员名称
	onMemberJoinedGroup(groupId, member){
		var conversation; // 不能删
		var textMsgBody;
		var textRecvMsg;
		var msgs;
		var group = this.groupManager.groupWithId(groupId);
		const {
			inviteMemberAction,
			conversations,
			messages,
			receiveMsgAction,
			selectConversationId,
			userInfo
		} = this.props;

		msgs = messages[group.groupId()] || [];
		conversation = this.chatManager.conversationWithType(group.groupId(), 1);
		{
			textMsgBody = new easemob.EMTextMessageBody(`${member} 加入群`);
			textRecvMsg = easemob.createReceiveMessage(group.groupId(), userInfo.user.easemobName, textMsgBody);
			textRecvMsg.setFrom("oa-easemob-system");
			if(msgs[msgs.length - 1]){
				textRecvMsg.setLocalTime(msgs[msgs.length - 1].localTime() + 1);
				textRecvMsg.setTimestamp(msgs[msgs.length - 1].timestamp() + 1);
			}
			else{
				textRecvMsg.setLocalTime(moment().format("x"));
				textRecvMsg.setTimestamp(moment().format("x"));
			}
			conversation.insertMessage(textRecvMsg);
			msgs.push(textRecvMsg);
			receiveMsgAction(
				{
					messages: msgs,
					selectConversationId,
					id: group.groupId(),
					user: userInfo.user.easemobName,
					conversation
				}
			);
		}
	}

	// 成员离开群组时触发
	// group : 发生操作的群组
	// member : 离开群组的成员名称
	onMemberLeftGroup(groupId, member){
		var conversation; // 不能删
		var textMsgBody;
		var textRecvMsg;
		var msgs;
		var group = this.groupManager.groupWithId(groupId);

		console.log("\n\n EMGroupManagerListener onMemberLeftGroup ----- !");
		console.log(`${member} has left the group ${group.groupId()}`);
		console.log(`group.groupSubject() = ${group.groupSubject()}`);
		console.log(`group.groupDescription() = ${group.groupDescription()}`);
		console.log(`group.groupMembers() = ${group.groupMembers()}`);

		const { userInfo, messages } = this.props;
		conversation = this.chatManager.conversationWithType(group.groupId(), 1);
		{
			textMsgBody = new easemob.EMTextMessageBody(`${member} 离开群`);
			textRecvMsg = easemob.createReceiveMessage(group.groupId(), userInfo.user.easemobName, textMsgBody);
			textRecvMsg.setFrom("oa-easemob-system");
			msgs = messages[group.groupId()] || [];
			if(msgs[msgs.length - 1]){
				textRecvMsg.setLocalTime(msgs[msgs.length - 1].localTime() + 1);
				textRecvMsg.setTimestamp(msgs[msgs.length - 1].timestamp() + 1);
			}
			else{
				textRecvMsg.setLocalTime(moment().format("x"));
				textRecvMsg.setTimestamp(moment().format("x"));
			}
			msgs.push(textRecvMsg);
			conversation.insertMessage(textRecvMsg);
		}

	}

	// 离开群组时触发
	// group : 发生操作的群组
	// reason : 离开群组的原因（0: 被踢出 1:群组解散 2:被服务器下线）
	onLeaveGroup(groupId, reason){
		var group = this.groupManager.groupWithId(groupId);
		console.log("\n\n EMGroupManagerListener onLeaveGroup ----- !");
		console.log(`group.groupId() = ${group.groupId()}`);
		console.log(`group.groupSubject() = ${group.groupSubject()}`);
		console.log(`group.groupDescription() = ${group.groupDescription()}`);
		console.log(`reason = ${reason}`);
		const { leaveGroupAction, setNotice } = this.props;
		switch(reason){
		case 0: // 被踢
			this.chatManager.removeConversation(group.groupId());
			leaveGroupAction(group.groupId());
			setNotice(`您已被群主踢出${group.groupSubject()}群组`);
			break;
		case 1: // 群组解散
			this.chatManager.removeConversation(group.groupId());
			leaveGroupAction(group.groupId());
			setNotice(`群主已解散${group.groupSubject()}群组`);
			break;
		default:
			break;
		}
	}


	// 收到邀请别人入群同意消息
	onReceiveInviteAcceptionFromGroup(group, invitee){
		const { inviteMemberAction } = this.props;
		inviteMemberAction({ id: group.groupId(), members: [invitee] });
	}

	// 收到消息回调，图片文件类型需要 download
	onReceiveMsg(msgs){
		const {
			messages,
			allMembersInfo,
			receiveMsgAction,
			selectConversationId,
			userInfo,
			conversations,
			groupAtAction,
			globals
		} = this.props;
		var conversation;
		var conversationType;
		var inviterConversation;

		var atMsg;
		var msg;
		var me = this;
		console.log("receive msg:" + msgs);
		msgs.forEach(function(message){
			var conversationId = message.conversationId();
			var conversationOfMessages;
			var conference = message.getAttribute("conference");
			let logintoken = me.emclient.getLoginInfo().loginToken();
			conversationOfMessages = messages[conversationId] || [];
			msg = message.bodies()[0];
			switch(msg.type()){
			case 1: // image message
				me.chatManager.downloadMessageAttachments(message);
				me.chatManager.downloadMessageThumbnail(message);
				break;
			case 2: // file message
			case 4:
				me.chatManager.downloadMessageAttachments(message);
				break;
			default:
				break;
			}

			// console.log(msgs[0].getAttribute("em_at_list"));
			// 有人 @ 我
			atMsg = message.getAttribute("em_at_list");
			if(
				atMsg &&
			(
				atMsg.indexOf(userInfo.user.easemobName) > -1 ||
				(typeof atMsg == "string" && atMsg.toLowerCase() == "all")
			)

			){
				groupAtAction({ [conversationId]: [userInfo.user.easemobName] });
			}

			conversationType = message.chatType();	// 0 单聊  1 群聊
			conversation = me.chatManager.conversationWithType(conversationId, conversationType);
			!conference && conversationOfMessages.push(message);

			// 后期要改，需要根据窗体显示状态和是否选中来判断
			if(conversationId == selectConversationId){
				message.setIsRead(true);
			}

			// 先判断是不是群组， 再判断下群组列表里有没有这个群组，没有的话去取一下群信息
			if(conversationType == 1 && (!conversations[conversationId])){
				this.groupManager.fetchAllMyGroups(error).then(groups => {
					let allGroups = [];
					groups.map((group) => {
						allGroups.push(group.groupId());
					});
					setGroupChats({allGroups});
			    });
		    }
			else if(conversationType == 0 && (!allMembersInfo[conversationId])){
				this.groupManager.fetchAllMyGroups(error).then(groups => {
					let allGroups = [];
					groups.map((group) => {
						allGroups.push(group.groupId());
			        });
			        setGroupChats({allGroups});
				});
			}
			receiveMsgAction(
				{
					messages: conversationOfMessages,
					selectConversationId,
					id: conversationId,
					user: userInfo.user.easemobName,
					conversation,
					unReadMsg: message.isRead() ? [] : [message.msgId()]
				}
			);
		});


	}
	render(){
		return (
			<div className="oa-main-container">
				<TopNav {...this.props}/>
				<div className="nav-container">
					<Navbar className="dock-left primary shadow-2" />
					<Container />
				</div>
			</div>);

	}
}
const mapStateToProps = state => ({
	globals: state.globals,
	userInfo: state.userInfo,
	selectConversationId: state.selectConversationId,
	allMembersInfo: state.allMembersInfo,
	messages: state.messages,
	conversations: state.conversations,
});
export default withRouter(connect(mapStateToProps, actionCreators)(MainView));
