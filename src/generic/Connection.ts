import {ConnectionOptions} from "../types/Connection";

class Connection {

    private connectionOptions: ConnectionOptions;


    constructor(connectionOptions: ConnectionOptions) {
        this.connectionOptions = connectionOptions;
    }
}

export {
    Connection,
};
