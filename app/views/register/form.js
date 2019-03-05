import React, { PureComponent } from "react";
import { connect } from "react-redux";
import * as actionCreators from "@/stores/actions";
import Lang from "@/lang";
import * as selectors from "@/stores/selectors";
import { Form, Icon, Input, Button, Checkbox } from "antd";
import { Link } from "react-router-dom";
import { utils } from "@/utils/utils";
const session = require("electron").remote.session;
// const easemob = require('../../node/index');
// const fs = require("fs-extra");
// const { remote } = require("electron");
// const configDir = remote.app.getPath("userData");
var checkedVal;
class RegisterForm extends PureComponent {
	constructor(props){
		super(props);
		// this.state = {
		// 	userName: "",
		// 	password: "",
		// };
		// this.getCookie();

		this.handleRegister = this.handleRegister.bind(this);
		// this.handleChangePassword = this.handleChangePassword.bind(this);
		// this.handleSetCookie = this.handleSetCookie.bind(this);
	}


	handleRegister(){
		const { requestLogin, setNotice, globalAction } = this.props.reduxProps;
		const { form } = this.props;
		form.validateFields((err, fieldsValue)=>{
			
			this.emclient = utils.initEmclient();
			this.emclient.createAccount(fieldsValue.userName, fieldsValue.password).then((error) => {
			    if(error.errorCode == 0){
			    	globalAction({
						emclient: this.emclient
					});
			        console.log("createAccount success");
			    }
			    else{
			        console.log("createAccount fail:" + error.description);
			    }
		    },(err)=>{
		    	console.log(err,9999);
		    })

		});
	}

	render(){
		const { getFieldDecorator } = this.props.form;
		return (
			<Form
				className="login-form"
			>
				<FormItem>
					{getFieldDecorator("userName", {
						rules: [{ required: true, message: Lang.string("login.account.required") } ],
					})(
						<Input
							prefix={ <Icon type="user"style={ { color: "rgba(0,0,0,.25)" } } /> }
							placeholder={ Lang.string("login.account.hint") }
						/>
					)}
				</FormItem>
				<FormItem>
					{getFieldDecorator("password", {
						rules: [{ required: true, message: Lang.string("login.password.required") } ],
					})(
						<Input
							prefix={ <Icon type="lock" style={ { color: "rgba(0,0,0,.25)" } } /> }
							type="password"
							placeholder={ Lang.string("login.password.label") }
						/>
					)}
				</FormItem>
				<FormItem>
					{getFieldDecorator("nick", {
						rules: [{ required: true, message: Lang.string("login.nickName.required") } ],
					})(
						<Input
							prefix={ <Icon type="lock" style={ { color: "rgba(0,0,0,.25)" } } /> }
							placeholder={ Lang.string("login.nickName.label") }
						/>
					)}
				</FormItem>
				<FormItem>
					<Button type="primary" htmlType="submit" className="login-form-button" onClick={this.handleRegister}>
						{ Lang.string("register.btn.label") }
					</Button>
				</FormItem>
				<Link to="/index">
					返回登录
				</Link>
			</Form>
		);
	}
}
const FormItem = Form.Item;
const WrappedRegisterForm = Form.create()(RegisterForm);
class Register extends PureComponent {
	render(){
		return (
			<div className="app-login-form">
				<WrappedRegisterForm reduxProps={ this.props } />
			</div>
		);
	}
}

const mapStateToProps = state => ({
	loginRequest: selectors.getRequest(state, "login"),
});
export default connect(mapStateToProps, actionCreators)(Register);
