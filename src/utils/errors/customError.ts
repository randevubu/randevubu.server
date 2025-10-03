export class CustomError extends Error {
  constructor(message: string, public statusCode: number, public data?: any) {
      super(message);
      this.name = this.constructor.name;
  }
}

export class VerificationCodeOrEmailMissingError extends CustomError {
  constructor(message: string = "Both verification code and new email are required", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "VerificationCodeOrEmailMissingError";
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = "Unauthorized", data?: any, statusCode: number = 401) {
    super(message, statusCode, data);
    this.name = "UnauthorizedError";
  }
}

export class VerificationCodeExpiredError extends CustomError {
  constructor(message: string = "Verification code has expired. Please request a new code.", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "VerificationCodeExpiredError";
  }
}

export class InvalidVerificationStepError extends CustomError {
  constructor(message: string = "Invalid verification step", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "InvalidVerificationStepError";
  }
}


export class EmailOrCodeMissingError extends CustomError {
  constructor(message: string = "Email and code are required", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "EmailOrCodeMissingError";
  }
}

export class InvalidOrExpiredVerificationCodeError extends CustomError {
  constructor(message: string = "Invalid or expired verification code", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "InvalidOrExpiredVerificationCodeError";
  }
}

export class EmailNotFoundError extends CustomError {
  constructor(message: string = "Email not found", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "EmailNotFoundError";
  }
}

export class EmailRequiredError extends CustomError {
  constructor(message: string = "Email is required", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "EmailRequiredError";
  }
}

export class ResetTokenRequiredError extends CustomError {
  constructor(message: string = "Reset token is required", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "ResetTokenRequiredError";
  }
}

export class InvalidOrExpiredResetTokenError extends CustomError {
  constructor(message: string = "Invalid or expired reset token", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "InvalidOrExpiredResetTokenError";
  }
}

export class NewPasswordRequiredError extends CustomError {
  constructor(message: string = "Reset token and new password are required", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "NewPasswordRequiredError";
  }
}

export class InvalidCategoryIdError extends CustomError {
  constructor(message: string = "Invalid category ID", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = "InvalidCategoryIdError";
  }
}

export class OfficeNotFoundError extends CustomError {
  constructor(message: string = "Office not found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = "OfficeNotFoundError";
  }
}


export class OfficesNotFoundError extends CustomError {
  constructor(message: string = "Offices not found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'OfficesNotFoundError';
  }
}


export class InvalidEmailError extends CustomError {
  constructor(message: string = "Invalid email", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'InvalidEmailError';
  }
}


export class RequiredEmailPasswordError extends CustomError {
  constructor(message: string = "Password and new email are required for email change request", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'RequiredEmailPasswordError';
  }
}





export class DatabaseError extends CustomError {
  constructor(message: string = "Database error occurred", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = "DatabaseError";
  }
}

export class FavoritesNotFoundError extends CustomError {
  constructor(message: string = "Favorites not found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'FavoritesNotFoundError';
  }
}


export class InvalidUserIdOrAdIdError extends CustomError {
  constructor(message: string = "Invalid userId or adId", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'InvalidUserIdOrAdIdError';
  }
}


export class FavoriteOperationError extends CustomError {
  constructor(message: string = "Failed to add or remove from favorites", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'FavoriteOperationError';
  }
}
export class EmailSendError extends CustomError {
  constructor(message: string = "Failed to send email", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = 'EmailSendError';
  }
}

export class CategoryDatabaseError extends DatabaseError {
  constructor(message: string = "Category database operation failed", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = "CategoryDatabaseError";
  }
}

export class SubCategoryDatabaseError extends DatabaseError {
  constructor(message: string = "SubCategory database operation failed", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = "SubCategoryDatabaseError";
  }
}

export class AdDatabaseError extends DatabaseError {
  constructor(message: string = "Ad database operation failed", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = "AdDatabaseError";
  }
}

export class OfficeDatabaseError extends DatabaseError {
  constructor(message: string = "Office database operation failed", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = "OfficeDatabaseError";
  }
}

export class UserDatabaseError extends DatabaseError {
  constructor(message: string = "User database operation failed", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = "UserDatabaseError";
  }
}

export class FavoritesDatabaseError extends DatabaseError {
  constructor(message: string = "Favorites database operation failed", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = "FavoritesDatabaseError";
  }
}

export class EmailAlreadyExistsError extends CustomError {
  constructor(message: string = "Email already exists", data?: any, statusCode: number = 409) {
    super(message, statusCode, data);
    this.name = 'EmailAlreadyExistsError';
  }
}


export class UserAlreadyExistsError extends CustomError {
  constructor(message: string = "User already exists", data?: any, statusCode: number = 409) {
    super(message, statusCode, data);
    this.name = 'UserAlreadyExistsError';
  }
}

export class UserNotFoundError extends CustomError {
  constructor(message: string = "User not found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'UserNotFoundError';
  }
}

export class InvalidPasswordError extends CustomError {
  constructor(message: string = "Invalid password", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'InvalidPasswordError';
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = "Authorization error", data?: any, statusCode: number = 403) {
    super(message, statusCode, data);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends CustomError {
  constructor(message: string = "Validation error", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'ValidationError';
  }
}

export class InvalidAuthorizationRole extends CustomError {
  constructor(message: string = "Invalid authorization role", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'InvalidAuthorizationRole';
  }
}


export class EmailNotSentError extends CustomError {
  constructor(message: string = "Email not sent", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = 'EmailNotSentError';
  }
}



export class InvalidVerificationCodeError extends CustomError {
  constructor(message: string = "Invalid verification code", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'InvalidVerificationCodeError';
  }
}




export class CategoriesNotFoundError extends CustomError {
  constructor(message: string = "Categories not found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'CategoriesNotFoundError';
  }
}


export class CategoryNotFoundError extends CustomError {
  constructor(message: string = "Category not found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'CategoryNotFoundError';
  }
}


export class SubCategoriesNotFoundError extends CustomError {
  constructor(message: string = "Subcategories not found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'SubCategoriesNotFoundError';
  }
}



export class AdsNotFoundError extends CustomError {
  constructor(message: string = "No ads found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'AdsNotFoundError';
  }
}

export class AdNotFoundError extends CustomError {
  constructor(message: string = "Ad not found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'AdNotFoundError';
  }
}

export class CreateAdError extends CustomError {
  constructor(message: string = "Failed to create ad", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'CreateAdError';
  }
}


export class ImageUploadError extends CustomError {
  constructor(message: string = "Failed to upload images", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = 'ImageUploadError' ;
  }
}


export class UserNotAssociatedWithOfficeError extends CustomError {
  constructor(message: string = "User is not associated with an office", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'UserNotAssociatedWithOfficeError';
  }
}

export class AdsNotFoundForUser extends CustomError {
  constructor(message: string = "No ads found for this user", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'AdsNotFoundForUser';
  }
}




export class DocumentUploadError extends CustomError {
  constructor(message: string = "Failed to upload document", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = 'DocumentUploadError';
  }
}


export class CodeGenerationError extends CustomError{
  constructor(message: string= "Failed to generate code",data?:any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = 'CodeGenerationError';
  }
}


export class TokenVerificationError extends CustomError {
  constructor(message: string = "Failed to verify token", data?: any, statusCode: number = 401) {
    super(message, statusCode, data);
    this.name = 'TokenVerificationError';
  }
}



export class EmailNotVerifiedError extends CustomError {
  constructor(message: string = "Email not verified", data?: any, statusCode: number = 403) {
    super(message, statusCode, data);
    this.name = 'EmailNotVerifiedError';
  }
}



export class MissingCredentialsError extends CustomError {
  constructor(message: string = "Email and password are required", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'MissingCredentialsError';
  }
}


export class UserIdNotFoundError extends CustomError {
  constructor(message: string = "User ID not found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'UserIdNotFoundError';
  }
}

export class InvalidUserIdError extends CustomError {
  constructor(message: string = "Invalid ID provided", data?: any, statusCode: number = 400) {
    super(message, statusCode, data);
    this.name = 'InvalidIdError';
  }
}


export class PasswordIsRequiredError extends CustomError {
  constructor(message: string = "Password is required", data?: any, statusCode: number = 422) {
    super(message, statusCode, data);
    this.name = 'PasswordIsRequiredError';
  }
}


export class CategoryWithSelectedSubcategoriesNotFoundError extends CustomError {
  constructor(message: string = "Category with selected subcategory not found", data?: any, statusCode: number = 404) {
    super(message, statusCode, data);
    this.name = 'CategoryWithSelectedSubcategoriesNotFoundError';
  }
}


export class FailedToSendVerificationEmailError extends CustomError {
  constructor(message: string = "Failed to send verification email", data?: any, statusCode: number = 500) {
    super(message, statusCode, data);
    this.name = 'FailedToSendVerificationEmailError';
  }
}
