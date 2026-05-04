import numpy as np
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler


class LSTMClassifier:
    def __init__(
        self,
        epochs=35,
        batch_size=32,
        lstm_units=32,
        dense_units=16,
        learning_rate=0.001,
        random_state=42,
        verbose=0,
    ):
        self.epochs = epochs
        self.batch_size = batch_size
        self.lstm_units = lstm_units
        self.dense_units = dense_units
        self.learning_rate = learning_rate
        self.random_state = random_state
        self.verbose = verbose
        self.scaler = StandardScaler()
        self.model = None
        self.feature_importances_ = None
        self.backend = "tensorflow"

    def _tensorflow(self):
        try:
            import tensorflow as tf
        except ImportError as exc:
            return None

        return tf

    def _build_model(self, input_shape):
        tf = self._tensorflow()
        tf.keras.utils.set_random_seed(self.random_state)

        model = tf.keras.Sequential(
            [
                tf.keras.layers.Input(shape=input_shape),
                tf.keras.layers.LSTM(self.lstm_units),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(self.dense_units, activation="relu"),
                tf.keras.layers.Dense(1, activation="sigmoid"),
            ]
        )
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=self.learning_rate),
            loss="binary_crossentropy",
            metrics=["accuracy"],
        )
        return model

    def _prepare_features(self, x, fit=False):
        values = x.to_numpy(dtype=np.float32) if hasattr(x, "to_numpy") else np.asarray(x, dtype=np.float32)
        scaled = self.scaler.fit_transform(values) if fit else self.scaler.transform(values)
        return scaled.reshape((scaled.shape[0], 1, scaled.shape[1]))

    def fit(self, x, y):
        tf = self._tensorflow()
        target = np.asarray(y, dtype=np.float32)

        if tf is None:
            self.backend = "mlp_fallback"
            values = x.to_numpy(dtype=np.float32) if hasattr(x, "to_numpy") else np.asarray(x, dtype=np.float32)
            scaled = self.scaler.fit_transform(values)
            self.model = MLPClassifier(
                hidden_layer_sizes=(self.lstm_units, self.dense_units),
                activation="relu",
                learning_rate_init=self.learning_rate,
                max_iter=max(self.epochs * 12, 200),
                random_state=self.random_state,
            )
            self.model.fit(scaled, target)
            self.feature_importances_ = self._fallback_feature_importances(scaled, target)
            return self

        features = self._prepare_features(x, fit=True)

        positive_count = float(target.sum())
        negative_count = float(len(target) - positive_count)
        class_weight = None
        if positive_count > 0:
            class_weight = {
                0: 1.0,
                1: negative_count / positive_count,
            }

        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor="val_loss",
                patience=6,
                restore_best_weights=True,
            )
        ]
        self.model = self._build_model((features.shape[1], features.shape[2]))
        self.model.fit(
            features,
            target,
            epochs=self.epochs,
            batch_size=self.batch_size,
            validation_split=0.15,
            class_weight=class_weight,
            callbacks=callbacks,
            verbose=self.verbose,
        )
        self.feature_importances_ = self._estimate_feature_importances(features.shape[2])
        return self

    def _fallback_feature_importances(self, features, target):
        correlations = []
        for index in range(features.shape[1]):
            column = features[:, index]
            if np.std(column) == 0:
                correlations.append(0.0)
                continue
            correlations.append(abs(np.corrcoef(column, target)[0, 1]))
        correlations = np.nan_to_num(np.asarray(correlations), nan=0.0)
        total = float(correlations.sum())
        return correlations / total if total else np.zeros(features.shape[1])

    def _estimate_feature_importances(self, feature_count):
        if self.model is None:
            return np.zeros(feature_count)

        lstm_weights = self.model.layers[0].get_weights()
        if not lstm_weights:
            return np.zeros(feature_count)

        input_kernel = np.abs(lstm_weights[0]).mean(axis=1)
        total = float(input_kernel.sum())
        if total == 0:
            return np.zeros(feature_count)
        return input_kernel / total

    def predict_proba(self, x):
        if self.backend == "mlp_fallback":
            values = x.to_numpy(dtype=np.float32) if hasattr(x, "to_numpy") else np.asarray(x, dtype=np.float32)
            scaled = self.scaler.transform(values)
            probabilities = self.model.predict_proba(scaled)[:, 1]
        else:
            features = self._prepare_features(x, fit=False)
            probabilities = self.model.predict(features, verbose=0).reshape(-1)
        probabilities = np.clip(probabilities, 0.0, 1.0)
        return np.column_stack((1 - probabilities, probabilities))

    def predict(self, x):
        return (self.predict_proba(x)[:, 1] >= 0.5).astype(int)

    def __getstate__(self):
        state = self.__dict__.copy()
        if state.get("backend") == "mlp_fallback":
            return state
        model = state.pop("model", None)
        if model is not None:
            state["model_json"] = model.to_json()
            state["model_weights"] = model.get_weights()
        else:
            state["model_json"] = None
            state["model_weights"] = None
        return state

    def __setstate__(self, state):
        if state.get("backend") == "mlp_fallback":
            self.__dict__.update(state)
            return
        model_json = state.pop("model_json", None)
        model_weights = state.pop("model_weights", None)
        self.__dict__.update(state)
        self.model = None

        if model_json is not None:
            tf = self._tensorflow()
            self.model = tf.keras.models.model_from_json(model_json)
            self.model.set_weights(model_weights)
            self.model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=self.learning_rate),
                loss="binary_crossentropy",
                metrics=["accuracy"],
            )
