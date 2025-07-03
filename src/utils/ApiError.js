
class ApiError extends Error {
    constructor(statusCode, message="Something went wrong",data, error=[], stack="") {
        super(message);
        this.statusCode = statusCode;
        this.error = error;
        this.data = data || null;

        if(stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
};

export { ApiError };