
const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (err) {
        res.status(err.statusCode || 500).json({
            status: err.statusCode || 500,
            success: false,
            message: err.message,
            data: err.data || null
        });
       
    }
};

export { asyncHandler };