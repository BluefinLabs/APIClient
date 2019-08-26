// @flow
import React, { Component, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, message, Button, Icon, Row, Col, Form, Input, Select, List } from 'antd';
import axios from 'axios';
const Papa = require('papaparse');
const { Option } = Select;

const Home = (props) => {

const [objTmp, fnUpdate] = useState({
   "results":[]
  ,"data":[]
});

var objForm={
     "un":''
    ,"pw":''
    ,"act":'activate'
    ,"api":'https://bluefin.p2pemanager.com:3010'
    ,"deviceType":'iSMP4'
  };

const fnGo=function(e){
  e.preventDefault();
  var strAuth=btoa( objTmp.un+':'+objTmp.pw );
  switch (objForm.act){
    case 'deviceTypes': fnGetDeviceTypes(strAuth); break;
    case 'activate': fnActivateDevices(strAuth); break;
  }  
}

const fnHandleError=function(objErr){
  console.log(objErr);
  if(objErr.response && objErr.response.status){
    switch ( objErr.response.status ){
      case 401: message.error( 'Error: ' + objErr.response.status +  ' login failed.' ); break;
    }
  }
}

const fnProcessFile=function(e){
  Papa.parse(  e[0], {
        delimiter: ',',
        header:true,
        complete: function(objResults) {
          fnUpdate({...objTmp,"data":objResults.data});
          message.info('file loaded with '+objResults.data.length+' records');
        }
      });
}

const fnGetId=function(arrData){
  var strAuth=btoa( objTmp.un+':'+objTmp.pw );
  //console.log('strAuth',strAuth);
  var strDeviceType=objForm.deviceType;
  if(arrData['DeviceType']){ strDeviceType=arrData['DeviceType']; }
  //kept coming in frong in the file so aliasing it.
  if(strDeviceType==='iSMPv4'){ strDeviceType = 'iSMP4'; }
 
  var arrResults=objTmp.results;
  arrData.status='Getting ID for Serial';
  arrData.complete=false;
  arrResults.push(arrData);
  fnUpdate({...objTmp,"results":arrResults});

  axios({
    "method": 'get',
    "headers": {"Authorization": 'Basic '+strAuth,"Accept": 'application/json',"Content-Type": 'application/json'},
    "url": objForm.api+'/api/v1/devices/'+arrData['SerialNumber']+'/'+strDeviceType,
  }).then(function (objResponse) {
        var arrResults=objTmp.results;
        var strStatus='Already Activating or Activated';
        var bitComplete=false;
        //console.log(objResponse.data);
        //console.log('serialNumber: ', objResponse.data.serialNumber, ' State: ', objResponse.data.deviceState.name);
        if(objResponse.data.deviceState.id !== 15 && objResponse.data.deviceState.id !== 16){
          if(objResponse.data.deviceState.id === 3){
            //console.log('\n setting: '+objResponse.data.serialNumber+', to stored')
            strStatus='Setting to Stored';
            fnAct(objResponse.data.id, 10);
          }else if(objResponse.data.deviceState.id === 10){
            //console.log('\n setting: '+objResponse.data.serialNumber+', to stored');
            strStatus='Setting to Activating';
            fnAct(objResponse.data.id, 15);
          }
        }else{
          //console.log('serial,id',objResponse,arrData);
          var strStatus='Already Activating or Activated';
          bitComplete=true;
          fnUpdate({...objTmp,"results":arrResults});
        }
          for(var i=0; i<arrResults.length; i++){ if(objResponse.data.serialNumber === arrResults[i].SerialNumber){ 
            arrResults[i].id=objResponse.data.id;
            arrResults[i].status=strStatus;
            arrResults[i].complete=bitComplete; 
          }}
        return objResponse.data.deviceState.id;
      }).catch(err => { fnHandleError(err); });
}

const fnAct=function(intId,intState){
  //console.log(intId);
  var strAuth=btoa( objTmp.un+':'+objTmp.pw );
  axios({
    "method": 'patch',
    "headers": {"Authorization": 'Basic '+strAuth,"Accept": 'application/json',"Content-Type": 'application/json'},
    "url": objForm.api+'/api/v1/devices/'+intId,
    "data":{
      "deviceState": { "id":intState }
    }
  }).then(function (objResponse) {
      console.log(objResponse.data.id,intId);
      var arrResults=objTmp.results;
      if(intState===10){ 
        for(var i=0; i<arrResults.length; i++){ if(objResponse.data.id === arrResults[i].id){ 
            arrResults[i].status='Set to Stored';
          }}
        fnUpdate({...objTmp,"results":arrResults});
        fnAct(intId,15)
      }
      if(intState===15){ 
        //console.log('Device Activated: ', objResponse.data); 
        for(var i=0; i<arrResults.length; i++){ if(objResponse.data.id === arrResults[i].id){ 
            arrResults[i].status='Set to Activating';
            arrResults[i].complete=true;
          }}
        fnUpdate({...objTmp,"results":arrResults});
      }
  }).catch(err => { fnHandleError(err); });
}

const fnActivateDevices=function(){
  var objGo = setInterval(function(){ 
    if(objTmp.data.length > 0){
      fnGetId(objTmp.data.pop());
    }else{
      clearInterval(objGo);
    }
  }, 1000);
}

const fnGetDeviceTypes=function(strAuth){
  axios({
    "method": 'get',
    "headers": {"Authorization": 'Basic '+strAuth,"Accept": 'application/json',"Content-Type": 'application/json'},
    "url": objForm.api+'/api/v1/deviceTypes/'
  }).then(objResponse => {        
    console.log(objResponse);
  }).catch(err => { fnHandleError(err); } );
}

const fnClearCompleted=function(){
  var arrResults=[];
  for(var i=0;i<objTmp.results.length;i++){
    if(objTmp.results[i].complete===false){ arrResults.push(objTmp.results[i]); }
  }
  fnUpdate({...objTmp,"results":arrResults});
}

const fnReset=function(){
  fnUpdate({...objTmp,"results":[],"data":[]});
}

    return (
      <div>
      <Row>
        <Col>
          <center>
            <h2>Bluefin P2PE API Tool</h2>
          </center>
        </Col>
      </Row>
      <Row>
        <Col span={12}>
          <h3>Settings</h3>
          <Form onSubmit={ fnGo } className="login-form">
            <Form.Item>
                <Input
                  prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />}
                  placeholder="Username"
                  onChange={ e => fnUpdate({...objTmp,"un":e.target.value}) }
                />
            </Form.Item>
            <Form.Item>
                <Input
                  prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />}
                  type="password"
                  placeholder="Password"
                  onChange={ e => fnUpdate({...objTmp,"pw":e.target.value}) }
                />
            </Form.Item>
            <Form.Item>
              <Select defaultValue="activate" onChange={ v =>objForm.act=v } >
                <Option value="deviceTypes">List Device Types</Option>
                <Option value="activate">Activate Devices</Option>
                <Option value="devices">Import Devices</Option>
                <Option value="locations">Import Locations</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Input
                  type="file"
                  accept=".csv"
                  onChange={ e => fnProcessFile(e.target.files) }
                />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                GO
              </Button>
              <Button type="primary" onClick={fnReset} style={{marginLeft:'10px'}} >
                Reset
              </Button>
              <Button type="primary" onClick={fnClearCompleted} style={{marginLeft:'10px'}}>
                Clear Completed
              </Button>
            </Form.Item>
          </Form>


        </Col>
        <Col span={12}>
          <h3>Results {objTmp.results.length} / {objTmp.data.length}</h3>
          { objTmp.results &&
            <List
              size="small"
              bordered
              dataSource={objTmp.results}
              renderItem={item => 
                  <List.Item>
                    <Row style={ {width:'100%'} }>
                      <Col span={14}>
                        {item.SerialNumber}
                      </Col>
                      <Col span={10}>
                        {item.status}
                      </Col>
                    </Row>
                  </List.Item>
            }
            />
          }
        </Col>
      </Row>
      </div>
    );
  }
export default Home;
