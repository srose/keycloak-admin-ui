import React, { useState } from "react";
import {
  ActionGroup,
  AlertVariant,
  Button,
  ButtonVariant,
  Divider,
  DropdownItem,
  Flex,
  FlexItem,
  FormGroup,
  PageSection,
  Text,
  TextArea,
  TextInput,
  TextVariants,
  ValidatedOptions,
} from "@patternfly/react-core";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { FormAccess } from "../components/form-access/FormAccess";
import { ViewHeader } from "../components/view-header/ViewHeader";
import { Link, useHistory } from "react-router-dom";
import { useRealm } from "../context/realm-context/RealmContext";
import { useAlerts } from "../components/alert/Alerts";
import { useAdminClient, useFetch } from "../context/auth/AdminClient";
import type ClientProfileRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientProfileRepresentation";
import { HelpItem } from "../components/help-enabler/HelpItem";
import { PlusCircleIcon } from "@patternfly/react-icons";
import "./RealmSettingsSection.css";
import { useConfirmDialog } from "../components/confirm-dialog/ConfirmDialog";
import type ClientPolicyRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientPolicyRepresentation";
import { toClientPolicies } from "./routes/ClientPolicies";

type NewClientPolicyForm = Required<ClientPolicyRepresentation>;

const defaultValues: NewClientPolicyForm = {
  name: "",
  description: "",
  conditions: [],
  enabled: true,
  profiles: [],
};

export const NewClientPolicyForm = () => {
  const { t } = useTranslation("realm-settings");
  const {
    register,
    errors,
    handleSubmit,
    reset: resetForm,
  } = useForm<NewClientPolicyForm>({
    defaultValues,
  });
  const { realm } = useRealm();
  const { addAlert, addError } = useAlerts();
  const adminClient = useAdminClient();
  const [policies, setPolicies] = useState<ClientProfileRepresentation[]>([]);
  const [
    showAddConditionsAndProfilesForm,
    setShowAddConditionsAndProfilesForm,
  ] = useState(false);

  const [createdPolicy, setCreatedPolicy] =
    useState<ClientPolicyRepresentation>();

  const history = useHistory();

  useFetch(
    () => adminClient.clientPolicies.listPolicies(),
    (policies) => {
      setPolicies(policies.policies ?? []);
    },
    []
  );

  const save = async (form: NewClientPolicyForm) => {
    const createdPolicy = {
      ...form,
      profiles: [],
      conditions: [],
    };

    const allPolicies = policies.concat(createdPolicy);

    try {
      await adminClient.clientPolicies.updatePolicy({
        policies: allPolicies,
      });
      addAlert(
        t("realm-settings:createClientPolicySuccess"),
        AlertVariant.success
      );
      setShowAddConditionsAndProfilesForm(true);
      setCreatedPolicy(createdPolicy);
    } catch (error) {
      addError("realm-settings:createClientProfileError", error);
    }
  };

  const [toggleDeleteDialog, DeleteConfirm] = useConfirmDialog({
    titleKey: t("deleteClientProfileConfirmTitle"),
    messageKey: t("deleteClientProfileConfirm"),
    continueButtonLabel: t("delete"),
    continueButtonVariant: ButtonVariant.danger,
    onConfirm: async () => {
      const updatedPolicies = policies.filter(
        (policy) => policy.name !== createdPolicy?.name
      );

      try {
        await adminClient.clientPolicies.updatePolicy({
          policies: updatedPolicies,
        });
        addAlert(t("deleteClientSuccess"), AlertVariant.success);
        history.push(toClientPolicies({ realm }));
      } catch (error) {
        addError(t("deleteClientError"), error);
      }
    },
  });

  return (
    <>
      <DeleteConfirm />
      <ViewHeader
        titleKey={
          showAddConditionsAndProfilesForm
            ? createdPolicy?.name!
            : t("createPolicy")
        }
        divider
        dropdownItems={
          showAddConditionsAndProfilesForm
            ? [
                <DropdownItem
                  key="delete"
                  value="delete"
                  onClick={() => {
                    toggleDeleteDialog;
                  }}
                  data-testid="deleteClientProfileDropdown"
                >
                  {t("deleteClientProfile")}
                </DropdownItem>,
              ]
            : undefined
        }
      />
      <PageSection variant="light">
        <FormAccess isHorizontal role="view-realm" className="pf-u-mt-lg">
          <FormGroup
            label={t("common:name")}
            fieldId="kc-name"
            isRequired
            helperTextInvalid={t("common:required")}
            validated={
              errors.name ? ValidatedOptions.error : ValidatedOptions.default
            }
          >
            <TextInput
              ref={register({ required: true })}
              type="text"
              id="kc-client-profile-name"
              name="name"
              data-testid="client-policy-name"
            />
          </FormGroup>
          <FormGroup label={t("common:description")} fieldId="kc-description">
            <TextArea
              name="description"
              aria-label={t("description")}
              ref={register()}
              type="text"
              id="kc-client-policy-description"
              data-testid="client-policy-description"
            />
          </FormGroup>
          <ActionGroup>
            <Button
              variant="primary"
              onClick={handleSubmit(save)}
              data-testid="saveCreatePolicy"
              isDisabled={showAddConditionsAndProfilesForm}
            >
              {t("common:save")}
            </Button>
            <Button
              id="cancelCreatePolicy"
              onClick={() =>
                showAddConditionsAndProfilesForm
                  ? resetForm(createdPolicy)
                  : history.push(toClientPolicies({ realm }))
              }
              data-testid="cancelCreatePolicy"
            >
              {showAddConditionsAndProfilesForm
                ? t("realm-settings:reload")
                : t("common:cancel")}
            </Button>
          </ActionGroup>
          {showAddConditionsAndProfilesForm && (
            <>
              <Flex>
                <FlexItem>
                  <Text className="kc-conditions" component={TextVariants.h1}>
                    {t("conditions")}
                    <HelpItem
                      helpText={t("realm-settings-help:conditions")}
                      forLabel={t("conditionsHelpItem")}
                      forID={t("conditions")}
                    />
                  </Text>
                </FlexItem>
                <FlexItem align={{ default: "alignRight" }}>
                  <Button
                    id="addCondition"
                    component={(props) => (
                      <Link
                        {...props}
                        to={`/${realm}/realm-settings/clientPolicies`}
                      ></Link>
                    )}
                    variant="link"
                    className="kc-addCondition"
                    data-testid="cancelCreateProfile"
                    icon={<PlusCircleIcon />}
                  >
                    {t("realm-settings:addCondition")}
                  </Button>
                </FlexItem>
              </Flex>
              <Divider />
              <Text className="kc-emptyConditions" component={TextVariants.h6}>
                {t("realm-settings:emptyConditions")}
              </Text>
            </>
          )}
          {showAddConditionsAndProfilesForm && (
            <>
              <Flex>
                <FlexItem>
                  <Text
                    className="kc-client-profiles"
                    component={TextVariants.h1}
                  >
                    {t("clientProfiles")}
                    <HelpItem
                      helpText={t("realm-settings-help:clientProfiles")}
                      forLabel={t("clientProfilesHelpItem")}
                      forID={t("clientProfiles")}
                    />
                  </Text>
                </FlexItem>
                <FlexItem align={{ default: "alignRight" }}>
                  <Button
                    id="addExecutor"
                    variant="link"
                    className="kc-addClientProfile"
                    data-testid="cancelCreateProfile"
                    icon={<PlusCircleIcon />}
                  >
                    {t("realm-settings:addClientProfile")}
                  </Button>
                </FlexItem>
              </Flex>
              <Divider />
              <Text
                className="kc-emptyClientProfiles"
                component={TextVariants.h6}
              >
                {t("realm-settings:emptyProfiles")}
              </Text>
            </>
          )}
        </FormAccess>
      </PageSection>
    </>
  );
};