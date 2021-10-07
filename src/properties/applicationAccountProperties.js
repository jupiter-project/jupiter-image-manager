
/**
 * @TODO this class is obsolete. We should use the FeeManager.
 */
class ApplicationAccountProperties {
    /**
     *
     * @param deadline
     * @param minimumFee
     */
    constructor(deadline, minimumFee) {
        this.deadline = deadline;
        this.minimumFee = minimumFee;
    }
}

module.exports.ApplicationAccountProperties = ApplicationAccountProperties;
module.exports.applicationAccountProperties = new ApplicationAccountProperties(
    process.env.DEADLINE,
    process.env.MINIMUM_FEE
);
