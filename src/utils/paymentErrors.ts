import { AppError } from "./appError.js";

export class PaymentError
  extends AppError {
  constructor(
    message: string,
    statusCode = 400,
  ) {
    super(
      message,
      statusCode,
    );

    this.name =
      "PaymentError";

    Object.setPrototypeOf(
      this,
      PaymentError.prototype,
    );
  }
}

export class PaymentNotFoundError
  extends PaymentError {
  constructor(
    message =
      "Payment not found.",
  ) {
    super(
      message,
      404,
    );

    this.name =
      "PaymentNotFoundError";

    Object.setPrototypeOf(
      this,
      PaymentNotFoundError.prototype,
    );
  }
}

export class PaymentOwnershipError
  extends PaymentError {
  constructor(
    message =
      "You do not have access to this payment.",
  ) {
    super(
      message,
      403,
    );

    this.name =
      "PaymentOwnershipError";

    Object.setPrototypeOf(
      this,
      PaymentOwnershipError.prototype,
    );
  }
}

export class PaymentAlreadyCompletedError
  extends PaymentError {
  constructor(
    message =
      "This payment has already been completed.",
  ) {
    super(
      message,
      409,
    );

    this.name =
      "PaymentAlreadyCompletedError";

    Object.setPrototypeOf(
      this,
      PaymentAlreadyCompletedError.prototype,
    );
  }
}

export class PaymentAlreadyRefundedError
  extends PaymentError {
  constructor(
    message =
      "This payment has already been refunded.",
  ) {
    super(
      message,
      409,
    );

    this.name =
      "PaymentAlreadyRefundedError";

    Object.setPrototypeOf(
      this,
      PaymentAlreadyRefundedError.prototype,
    );
  }
}

export class PaymentChargebackError
  extends PaymentError {
  constructor(
    message =
      "This payment has been affected by a chargeback.",
  ) {
    super(
      message,
      409,
    );

    this.name =
      "PaymentChargebackError";

    Object.setPrototypeOf(
      this,
      PaymentChargebackError.prototype,
    );
  }
}

export class PaymentAmountError
  extends PaymentError {
  constructor(
    message =
      "The payment amount is invalid.",
  ) {
    super(
      message,
      409,
    );

    this.name =
      "PaymentAmountError";

    Object.setPrototypeOf(
      this,
      PaymentAmountError.prototype,
    );
  }
}

export class PaymentCurrencyError
  extends PaymentError {
  constructor(
    message =
      "The payment currency is invalid.",
  ) {
    super(
      message,
      409,
    );

    this.name =
      "PaymentCurrencyError";

    Object.setPrototypeOf(
      this,
      PaymentCurrencyError.prototype,
    );
  }
}

export class PaymentProviderError
  extends PaymentError {
  constructor(
    message =
      "The payment provider could not process the request.",
    statusCode = 502,
  ) {
    super(
      message,
      statusCode,
    );

    this.name =
      "PaymentProviderError";

    Object.setPrototypeOf(
      this,
      PaymentProviderError.prototype,
    );
  }
}

export class PaymentVerificationError
  extends PaymentError {
  constructor(
    message =
      "The payment could not be verified.",
  ) {
    super(
      message,
      409,
    );

    this.name =
      "PaymentVerificationError";

    Object.setPrototypeOf(
      this,
      PaymentVerificationError.prototype,
    );
  }
}

export class PaymentUnderpaymentError
  extends PaymentAmountError {
  constructor(
    message =
      "The payment amount received is less than the expected amount.",
  ) {
    super(message);

    this.name =
      "PaymentUnderpaymentError";

    Object.setPrototypeOf(
      this,
      PaymentUnderpaymentError.prototype,
    );
  }
}

export class PaymentFulfilmentError
  extends PaymentError {
  constructor(
    message =
      "The payment was successful but could not be fulfilled.",
  ) {
    super(
      message,
      409,
    );

    this.name =
      "PaymentFulfilmentError";

    Object.setPrototypeOf(
      this,
      PaymentFulfilmentError.prototype,
    );
  }
}

export class PaymentWorkshopCapacityError
  extends PaymentError {
  constructor(
    message =
      "This workshop currently has no available capacity.",
  ) {
    super(
      message,
      409,
    );

    this.name =
      "PaymentWorkshopCapacityError";

    Object.setPrototypeOf(
      this,
      PaymentWorkshopCapacityError.prototype,
    );
  }
}

export class PaymentWebhookError
  extends PaymentError {
  constructor(
    message =
      "The payment webhook could not be processed.",
    statusCode = 400,
  ) {
    super(
      message,
      statusCode,
    );

    this.name =
      "PaymentWebhookError";

    Object.setPrototypeOf(
      this,
      PaymentWebhookError.prototype,
    );
  }
}

export class PaymentWebhookSignatureError
  extends PaymentWebhookError {
  constructor(
    message =
      "Invalid payment webhook signature.",
  ) {
    super(
      message,
      401,
    );

    this.name =
      "PaymentWebhookSignatureError";

    Object.setPrototypeOf(
      this,
      PaymentWebhookSignatureError.prototype,
    );
  }
}

export class PaymentWebhookReplayError
  extends PaymentWebhookError {
  constructor(
    message =
      "This payment webhook event has already been processed.",
  ) {
    super(
      message,
      409,
    );

    this.name =
      "PaymentWebhookReplayError";

    Object.setPrototypeOf(
      this,
      PaymentWebhookReplayError.prototype,
    );
  }
}

export class PaymentReconciliationError
  extends PaymentError {
  constructor(
    message =
      "Payment reconciliation could not be completed.",
    statusCode = 409,
  ) {
    super(
      message,
      statusCode,
    );

    this.name =
      "PaymentReconciliationError";

    Object.setPrototypeOf(
      this,
      PaymentReconciliationError.prototype,
    );
  }
}

export class PaymentRefundError
  extends PaymentError {
  constructor(
    message =
      "The payment refund could not be processed.",
    statusCode = 409,
  ) {
    super(
      message,
      statusCode,
    );

    this.name =
      "PaymentRefundError";

    Object.setPrototypeOf(
      this,
      PaymentRefundError.prototype,
    );
  }
}

export class PaymentRefundAmountError
  extends PaymentRefundError {
  constructor(
    message =
      "The refund amount is invalid.",
  ) {
    super(
      message,
      400,
    );

    this.name =
      "PaymentRefundAmountError";

    Object.setPrototypeOf(
      this,
      PaymentRefundAmountError.prototype,
    );
  }
}