import crypto from 'crypto';

export class GravityCrypto {
    private decryptionAlgorithm: string;
    private decryptionPassword: string;

    constructor(decryptionAlgorithm: string, decryptionPassword: string) {
        this.decryptionAlgorithm = decryptionAlgorithm;
        this.decryptionPassword = decryptionPassword;
    }


    decrypt(data: string) {
        if(data === '') {
            throw new Error('the data to decrypt is empty');
        }

        try {
            const decipher = crypto.createDecipher(this.decryptionAlgorithm, this.decryptionPassword);
            let dec = decipher.update(data, 'hex', 'utf8');
            dec += decipher.final('utf8');
            return dec;
        } catch (error){
            throw new Error('unable to decrypt');
        }
    }


    encryptJson(json: Object){
        try {
            const jsonString = JSON.stringify(json);
            return this.encrypt(jsonString);
        } catch(error){
            throw error;
        }
    }

    encrypt(data: string) {
        if(data === '') {
            throw new Error('the data to decrypt is empty');
        }

        const cipher = crypto.createCipher(this.decryptionAlgorithm, this.decryptionPassword);
        let crypted = cipher.update(data, 'utf8', 'hex');
        crypted += cipher.final('hex');

        return crypted;
    }


    decryptOrNull(data: string) {
        try {
            return this.decrypt(data)
        } catch (error) {
            return null;
        }
    }
}
