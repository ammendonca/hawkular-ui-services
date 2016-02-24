///
/// Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///    http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

/**
 * @ngdoc provider
 * @name hawkular.rest.HawkularOps
 * @description
 * # HawkularOps
 * Asynchronous operations support
 */

module hawkularRest {

  // Schema definitions from: https://github.com/hawkular/hawkular-command-gateway/tree/master/hawkular-command-gateway-api/src/main/resources/schema
  interface ICommonResponse {
    message: string;
    status: string;
    resourcePath: string;
  }

  interface IExecutionOperationResponse extends ICommonResponse {
    operationName: string;
  }

  interface IDeployApplicationResponse extends ICommonResponse {
    destinationFileName: string;
  }

  interface IAddJdbcDriverResponse {
    status: string;
    resourcePath: string;
    message?: string;
  }

  interface IRemoveJdbcDriverResponse {
    resourcePath: string;
    destinationSessionId: string;
    status: string;
    message?: string;
  }

  interface IExportJdrResponse {
    status: string;
    resourcePath: string;
    fileName?: string;
    message?: string;
  }

  interface IAddDatasourceResponse {
    status: string;
    resourcePath: string;
    message?: string;
  }

  interface IUpdateDatasourceResponse {
    status: string;
    resourcePath: string;
    message?: string;
  }

  interface IRemoveDatasourceResponse {
    resourcePath: string;
    destinationSessionId: string;
    status: string;
    message?: string;
  }

  interface IGenericErrorResponse {
    errorMessage: string;
    stackTrace: string;
  }


  interface IWebSocketResponseHandler {
    prefix: string;
    handle: (any, binaryData?:Blob) => void;
  }


  _module.provider('HawkularOps', function () {

    this.setHost = (host) => {
      this.host = host;
      return this;
    };

    this.setPort = (port) => {
      this.port = port;
      return this;
    };

    this.$get = ['$location', '$rootScope', '$log', ($location, $rootScope, $log) => {
      // If available, used pre-configured values, otherwise use values from current browser location of fallback to
      // defaults
      this.setHost(this.host || $location.host() || 'localhost');
      this.setPort(this.port || $location.port() || 8080);

      const prefix = 'ws://' + this.host + ':' + this.port;
      const opsUrlPart = '/hawkular/command-gateway/ui/ws';
      const url = prefix + opsUrlPart;
      let factory:any = {};
      let NotificationService:any;

      let ws = new WebSocket(url);

      const responseHandlers:IWebSocketResponseHandler[] = [{
        prefix: 'GenericSuccessResponse=',
        handle: (operationResponse, binaryData:Blob) => {
          $log.log('Execution Operation request delivery: ', operationResponse.message);
        }
      },
        {
          prefix: 'WelcomeResponse=',
          handle: (welcomeResponse) => {
            $log.log('Welcome Response Received, sessionId: '+welcomeResponse.sessionId);
            $rootScope.$broadcast('WelcomeMessage', welcomeResponse.sessionId);
          }
        },
        {
        prefix: 'ExecuteOperationResponse=',
        handle: (operationResponse:IExecutionOperationResponse, binaryData:Blob) => {
          $log.log('Handling ExecuteOperationResponse');

          let message;
          if (operationResponse.status === "OK") {
            message = 'Operation "' + operationResponse.operationName + '" on resource "'
              + operationResponse.resourcePath + '" succeeded.';
            $rootScope.$broadcast('ExecuteOperationSuccess', message, operationResponse.resourcePath,
              operationResponse.operationName);
          } else if (operationResponse.status === "ERROR") {
            message = 'Operation "' + operationResponse.operationName + '" on resource "'
              + operationResponse.resourcePath + '" failed: ' + operationResponse.message;
            $rootScope.$broadcast('ExecuteOperationError', message, operationResponse.resourcePath,
              operationResponse.operationName);
          } else {
            $log.log('Unexpected operationResponse: ', operationResponse);
          }
        }
      },
        {
          prefix: 'DeployApplicationResponse=',
          handle: (deploymentResponse:IDeployApplicationResponse, binaryData:Blob)  => {
            let message;

            if (deploymentResponse.status === "OK") {
              message =
                'Deployment "' + deploymentResponse.destinationFileName + '" on resource "'
                + deploymentResponse.resourcePath + '" succeeded.';

              $rootScope.$broadcast('DeploymentAddSuccess', message);

            } else if (deploymentResponse.status === "ERROR") {
              message = 'Deployment File: "' + deploymentResponse.destinationFileName + '" on resource "'
                + deploymentResponse.resourcePath + '" failed: ' + deploymentResponse.message;

              $rootScope.$broadcast('DeploymentAddError', message);
            } else {
              message = 'Deployment File: "' + deploymentResponse.destinationFileName + '" on resource "'
                + deploymentResponse.resourcePath + '" failed: ' + deploymentResponse.message;
              $log.warn('Unexpected AddDeploymentOperationResponse: ', deploymentResponse);
              $rootScope.$broadcast('DeploymentAddError', message);
            }
          }
        },
        {
          prefix: 'AddJdbcDriverResponse=',
          handle: (addDriverResponse:IAddJdbcDriverResponse, binaryData:Blob)  => {
            let message;

            if (addDriverResponse.status === "OK") {
              message =
                addDriverResponse.message + '" on resource "' + addDriverResponse.resourcePath + '" with success.';

              $rootScope.$broadcast('JDBCDriverAddSuccess', message);

            } else if (addDriverResponse.status === "ERROR") {
              message = 'Add JBDC Driver on resource "'
                + addDriverResponse.resourcePath + '" failed: ' + addDriverResponse.message;

              $rootScope.$broadcast('JDBCDriverAddError', message);
            } else {
              message = 'Add JBDC Driver on resource "'
                + addDriverResponse.resourcePath + '" failed: ' + addDriverResponse.message;
              $log.warn('Unexpected AddJdbcDriverOperationResponse: ', addDriverResponse);
              $rootScope.$broadcast('JDBCDriverAddError', message);
            }
          }
        },
        {
          prefix: 'RemoveJdbcDriverResponse=',
          handle: (removeJdbcDriverResponse: IRemoveJdbcDriverResponse)  => {
            let message;

            if (removeJdbcDriverResponse.status === "OK") {
              message =
                removeJdbcDriverResponse.message + '" on resource "' + removeJdbcDriverResponse.resourcePath + '" with success.';

              $rootScope.$broadcast('JdbcDriverRemoveSuccess', message);

            } else if (removeJdbcDriverResponse.status === "ERROR") {
              message = 'Remove JDBC Driver on resource "'
                + removeJdbcDriverResponse.resourcePath + '" failed: ' + removeJdbcDriverResponse.message;

              $rootScope.$broadcast('JdbcDriverRemoveError', message);
            } else {
              message = 'Remove JDBC Driver on resource "'
                + removeJdbcDriverResponse.resourcePath + '" failed: ' + removeJdbcDriverResponse.message;
              $log.warn('Unexpected RemoveJdbcDriverOperationResponse: ', removeJdbcDriverResponse);
              $rootScope.$broadcast('JdbcDriverRemoveError', message);
            }
          }
        },
        {
          prefix: 'AddDatasourceResponse=',
          handle: (addDatasourceResponse:IAddDatasourceResponse, binaryData:Blob)  => {
            let message;

            if (addDatasourceResponse.status === "OK") {
              message =
                addDatasourceResponse.message + '" on resource "' + addDatasourceResponse.resourcePath + '" with success.';

              $rootScope.$broadcast('DatasourceAddSuccess', message);

            } else if (addDatasourceResponse.status === "ERROR") {
              message = 'Add Datasource on resource "'
                + addDatasourceResponse.resourcePath + '" failed: ' + addDatasourceResponse.message;

              $rootScope.$broadcast('DatasourceAddError', message);
            } else {
              message = 'Add Datasource on resource "'
                + addDatasourceResponse.resourcePath + '" failed: ' + addDatasourceResponse.message;
              $log.warn('Unexpected AddDatasourceOperationResponse: ', addDatasourceResponse);
              $rootScope.$broadcast('DatasourceAddError', message);
            }
          }
        },
        {
          prefix: 'UpdateDatasourceResponse=',
          handle: (updateDatasourceResponse:IUpdateDatasourceResponse, binaryData:Blob)  => {
            let message;

            if (updateDatasourceResponse.status === "OK") {
              message =
                updateDatasourceResponse.message + '" on resource "' + updateDatasourceResponse.resourcePath + '" with success.';

              $rootScope.$broadcast('DatasourceUpdateSuccess', message);

            } else if (updateDatasourceResponse.status === "ERROR") {
              message = 'Update Datasource on resource "'
                + updateDatasourceResponse.resourcePath + '" failed: ' + updateDatasourceResponse.message;

              $rootScope.$broadcast('DatasourceUpdateError', message);
            } else {
              message = 'Update Datasource on resource "'
                + updateDatasourceResponse.resourcePath + '" failed: ' + updateDatasourceResponse.message;
              $log.warn('Unexpected UpdateDatasourceOperationResponse: ', updateDatasourceResponse);
              $rootScope.$broadcast('DatasourceUpdateError', message);
            }
          }
        },
        {
          prefix: 'RemoveDatasourceResponse=',
          handle: (removeDatasourceResponse: IRemoveDatasourceResponse)  => {
            let message;

            if (removeDatasourceResponse.status === "OK") {
              message =
                removeDatasourceResponse.message + '" on resource "' + removeDatasourceResponse.resourcePath + '" with success.';

              $rootScope.$broadcast('DatasourceRemoveSuccess', message);

            } else if (removeDatasourceResponse.status === "ERROR") {
              message = 'Remove Datasource on resource "'
                + removeDatasourceResponse.resourcePath + '" failed: ' + removeDatasourceResponse.message;

              $rootScope.$broadcast('DatasourceRemoveError', message);
            } else {
              message = 'Remove Datasource on resource "'
                + removeDatasourceResponse.resourcePath + '" failed: ' + removeDatasourceResponse.message;
              $log.warn('Unexpected RemoveDatasourceOperationResponse: ', removeDatasourceResponse);
              $rootScope.$broadcast('DatasourceRemoveError', message);
            }
          }
        },
        {
          prefix: 'ExportJdrResponse=',
          handle: (jdrResponse:IExportJdrResponse, binaryData:Blob)  => {
            let message;

            if (jdrResponse.status === "OK") {
              const urlWithFileName = {
                url: URL.createObjectURL(binaryData),
                fileName: jdrResponse.fileName,
                jdrResponse: jdrResponse
              };
              $rootScope.$broadcast('ExportJDRSuccess', urlWithFileName);

            } else if (jdrResponse.status === "ERROR") {
              message = 'Export of JDR failed: ' + jdrResponse.message;
              $rootScope.$broadcast('ExportJDRError', {message, jdrResponse});
            } else {
              message = 'Export of JDR failed: ' + jdrResponse.message;
              console.error('Unexpected ExportJdrResponse: ', jdrResponse);
              $rootScope.$broadcast('ExportJDRError', {message, jdrResponse});
            }
          }
        },
        {
          prefix: 'GenericErrorResponse=',
          handle: (operationResponse:IGenericErrorResponse, binaryData:Blob) => {
            $log.warn('Unexpected Error Response: ', operationResponse.errorMessage);
            NotificationService.info('Operation failed: ' + operationResponse.errorMessage);
          }
        }];

      ws.onopen = () => {
        $log.log('Execution Ops Socket has been opened!');
      };

      ws.onclose = (event) => {
        $log.warn('Execution Ops Socket closed!');
        NotificationService.error('Execution Ops socket closed: ' + event.reason);
        $rootScope.$broadcast('WebSocketClosed', event.reason);
      };

      ws.onmessage = (message:any) => {
        $log.log('Execution Ops WebSocket received:', message);
        let data = message.data;

        if (data instanceof Blob) {
          let reader = new FileReader();
          reader.addEventListener("loadend", () => {
            let textPart:string = "";
            let content:any = reader.result;
            let counter:number = 0;
            let started:boolean = false;
            let lastPartOfText:number;

            for (lastPartOfText = 0 ; lastPartOfText < content.length ; lastPartOfText++) {
              if (content.charAt(lastPartOfText) === '{') {
                counter++;
                started = true;
              }

              if (content.charAt(lastPartOfText) === '}') {
                counter--;
              }

              textPart += content.charAt(lastPartOfText);

              if (started && counter === 0) {
                // chopping off the content, starting from the end of the text part, up to the end
                data = data.slice(lastPartOfText+1);

                // we have read already a json, and it's completely closed now
                break;
              }
            }
            dispatchToHandlers(textPart, data);
          });
          reader.readAsText(data);
        } else {
          dispatchToHandlers(data);
        }
      };

      function dispatchToHandlers(message:string, binaryData?:Blob) {
        let handlerFound:boolean = false;
        for (let i = 0; i < responseHandlers.length; i++) {
          let h = responseHandlers[i];
          if (message.indexOf(h.prefix) === 0) {
            handlerFound = true;
            let opResult = JSON.parse(message.substring(h.prefix.length));
            h.handle(opResult, binaryData);
            break;
          }
        }

        if (!handlerFound) {
          $log.info('Unexpected WebSocket Execution Ops message: ', message);
        }
      }

      factory.init = (ns:any) => {
        NotificationService = ns;
      };

      factory.performOperation = (operation:any) => {
        ws.send('ExecuteOperationRequest=' + JSON.stringify(operation));
      };

      factory.performAddDeployOperation = (resourcePath:string,
                                           destinationFileName:string,
                                           fileBinaryContent:any,
                                           authToken:string,
                                           personaId:string,
                                           enabled:boolean = true) => {
        let json = `DeployApplicationRequest={"resourcePath": "${resourcePath}",
        "destinationFileName":"${destinationFileName}", "enabled":"${enabled}",
          "authentication": {"token":"${authToken}", "persona":"${personaId}" } }`;

        let binaryblob = new Blob([json, fileBinaryContent], {type: 'application/octet-stream'});
        $log.log('DeployApplicationRequest: ' + json);
        ws.send(binaryblob);
      };

      factory.performAddJDBCDriverOperation = (resourcePath:string,
                                               driverJarName:string,
                                               driverName:string,
                                               moduleName:string,
                                               driverClass:string,
                                               driverMajorVersion:number,
                                               driverMinorVersion:number,
                                               fileBinaryContent:any,
                                               authToken:string,
                                               personaId:string) => {
        let driverObject:any = {
          resourcePath,
          driverJarName,
          driverName,
          moduleName,
          driverClass,
          authentication: {
            token: authToken,
            persona: personaId
          }
        };

        if (driverMajorVersion) {
          driverObject.driverMajorVersion = driverMajorVersion;
        }
        if (driverMinorVersion) {
          driverObject.driverMinorVersion = driverMinorVersion;
        }

        let json = `AddJdbcDriverRequest=${JSON.stringify(driverObject)}`;
        let binaryblob = new Blob([json, fileBinaryContent], {type: 'application/octet-stream'});
        $log.log('AddJDBCDriverRequest: ' + json);
        ws.send(binaryblob);
      };

      factory.performRemoveJdbcDriverOperation = (resourcePath:string,
                                                  authToken:string,
                                                  personaId:string
                                                  ) => {
        let driverObject:any = {
          resourcePath,
          authentication: {
            token: authToken,
            persona: personaId
          }
        };

        let json = `RemoveJdbcDriverRequest=${JSON.stringify(driverObject)}`;
        $log.log('RemoveJdbcDriverRequest: ' + json);
        ws.send(json);
      };

      factory.performAddDatasourceOperation = (resourcePath:string,
                                               authToken:string,
                                               personaId:string,
                                               xaDatasource:string,
                                               datasourceName:string,
                                               jndiName:string,
                                               driverName:string,
                                               driverClass:string,
                                               connectionUrl: string,
                                               xaDataSourceClass:string, // optional
                                               datasourceProperties:any, // optional
                                               userName:string, // optional
                                               password:string, // optional
                                               securityDomain:string // optional
                                               ) => {
        let datasourceObject:any = {
          resourcePath,
          xaDatasource,
          datasourceName,
          jndiName,
          driverName,
          driverClass,
          connectionUrl,
          xaDataSourceClass,
          datasourceProperties,
          userName,
          password,
          securityDomain,
          authentication: {
            token: authToken,
            persona: personaId
          }
        };

        let json = `AddDatasourceRequest=${JSON.stringify(datasourceObject)}`;
        $log.log('AddDatasourceRequest: ' + json);
        ws.send(json);
      };

      factory.performUpdateDatasourceOperation = (resourcePath:string,
                                               authToken:string,
                                               personaId:string,
                                               datasourceName:string,
                                               jndiName:string,
                                               driverName:string,
                                               driverClass:string,
                                               connectionUrl: string,
                                               xaDataSourceClass:string, // optional
                                               datasourceProperties:any, // optional
                                               userName:string, // optional
                                               password:string, // optional
                                               securityDomain:string // optional
                                               ) => {
        let datasourceObject:any = {
          resourcePath,
          datasourceName,
          jndiName,
          driverName,
          driverClass,
          connectionUrl,
          xaDataSourceClass,
          datasourceProperties,
          userName,
          password,
          securityDomain,
          authentication: {
            token: authToken,
            persona: personaId
          }
        };

        let json = `UpdateDatasourceRequest=${JSON.stringify(datasourceObject)}`;
        $log.log('UpdateDatasourceRequest: ' + json);
        ws.send(json);
      };

      factory.performRemoveDatasourceOperation = (resourcePath:string,
                                                  authToken:string,
                                                  personaId:string
                                                  ) => {
        let datasourceObject:any = {
          resourcePath,
          authentication: {
            token: authToken,
            persona: personaId
          }
        };

        let json = `RemoveDatasourceRequest=${JSON.stringify(datasourceObject)}`;
        $log.log('RemoveDatasourceRequest: ' + json);
        ws.send(json);
      };

      factory.performExportJDROperation = (resourcePath:string, authToken:string, personaId:string) => {
        let operation = {
          "resourcePath": resourcePath,
          "authentication": {
            "token": authToken,
            "persona": personaId
          }
        };
        let json = JSON.stringify(operation);
        $log.log('ExportJdrRequest=' + json);
        ws.send('ExportJdrRequest=' + json);
      };

      return factory;
    }];

  });
}
